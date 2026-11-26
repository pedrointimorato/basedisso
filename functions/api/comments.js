import {
  BODY_MAX,
  checkPostRate,
  errorJson,
  hashIp,
  isSameOrigin,
  json,
  normalizePage,
  recordRate,
  sanitizeBody,
  sanitizeName,
} from "../_lib/shared.js";
import { getSessionUser, publicUser } from "../_lib/auth.js";
import { lookupMentions } from "../_lib/mentions.js";
import { maskFor, readAvatar } from "../_lib/ascii.js";
import { canModerate, communityOfPage, getAdminContext, isSiteAdmin } from "../_lib/admins.js";
import { activeBan, attachConnections, banMessage } from "../_lib/conexoes.js";
import { TURNSTILE_ERRO, verifyTurnstile } from "../_lib/turnstile.js";
import { attachAnonAvatar } from "../_lib/anonimo.js";
import { ANON_NAME, B_ADMIN_COMMENT_SQL, anonBadgeAtPost, bAdminOf, isBAdmin, isOwn, anonUsuario, isAnonRow, realAuthors, withRealAuthor } from "../_lib/anonimo.js";

export const DELETED_COMMENT_TEXT = "[comentário excluído pelo autor]";

async function formatComment(db, row, viewer = null) {
  if (row.author_deleted_at) {
    return {
      id: row.id,
      page: row.page,
      parent_id: row.parent_id,
      name: null,
      body: DELETED_COMMENT_TEXT,
      created_at: row.created_at,
      usuario: null,
      mencoes: {},
      excluido: true,
    };
  }
  const mencoes = await lookupMentions(db, row.body);
  const anon = isAnonRow(row);
  const usuario = anon ? anonUsuario(row) : row.username
    ? {
        username: row.username,
        is_admin: Boolean(row.is_admin),
        b_admin: bAdminOf(row),
        is_primordial: Boolean(row.is_primordial),
        primordial_n: row.primordial_n == null ? null : Number(row.primordial_n),
        avatar: row.avatar || null,
        avatar_cores: row.avatar ? maskFor(row.avatar, row.avatar_colors) : null,
      }
    : null;
  return {
    id: row.id,
    page: row.page,
    parent_id: row.parent_id,
    name: usuario ? usuario.username : row.name,
    body: row.body,
    created_at: row.created_at,
    usuario,
    mencoes,
    anonimo: anon,
    proprio: isOwn(row, viewer),
    fixado: Boolean(row.pinned_at) && !row.parent_id,
    fixado_em: row.pinned_at || null,
  };
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB) return errorJson("Serviço de comentários indisponível.", 503);
  const url = new URL(request.url);
  const page = normalizePage(url.searchParams.get("page") || "");
  if (!page) return errorJson("Página inválida.", 400);
  const { results } = await env.DB.prepare(
    `SELECT c.id, c.page, c.parent_id, c.name, c.body, c.created_at, c.user_id, c.author_deleted_at, c.pinned_at, c.anon_by, c.anon_badge, c.ip_hash,
            u.username, u.is_admin, u.is_primordial, u.primordial_n, av.art AS avatar, av.colors AS avatar_colors, ${B_ADMIN_COMMENT_SQL}
     FROM comments c
     LEFT JOIN users u ON u.id = c.user_id
     LEFT JOIN profile_avatar av ON av.user_id = c.user_id
     LEFT JOIN comments p ON c.parent_id = p.id
     WHERE c.page = ? AND c.hidden = 0
       AND (c.parent_id IS NULL OR (p.id IS NOT NULL AND p.hidden = 0))
     ORDER BY c.created_at ASC
     LIMIT 500`
  )
    .bind(page)
    .all();
  const viewer = await getSessionUser(request, env);
  let ctx = null;
  if (viewer) {
    try { ctx = await getAdminContext(request, env); } catch { ctx = null; }
  }
  const reais = await realAuthors(env.DB, results, ctx, (r) => communityOfPage(r.page));
  const comentarios = [];
  for (const row of results || []) {
    comentarios.push(withRealAuthor(await formatComment(env.DB, row, viewer), reais));
  }
  await attachConnections(env.DB, results, comentarios, ctx, (r) => communityOfPage(r.page));
  await attachAnonAvatar(env.DB, comentarios);
  let fechado = false;
  const pk = page.match(/^\/b\/([^/]+)\/p\/([0-9a-f-]{36})$/);
  if (pk) {
    const post = await env.DB.prepare("SELECT author_deleted_at FROM posts WHERE id = ?").bind(pk[2]).first();
    fechado = Boolean(post && post.author_deleted_at);
  }
  // ADMs que podem fixar nesta página (site: qualquer página; /b/: a comunidade da página).
  const podeFixar = Boolean(ctx && ctx.any && canModerate(ctx, communityOfPage(page)));
  return json({ comentarios, fechado, pode_fixar: podeFixar });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return errorJson("Serviço de comentários indisponível.", 503);
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);

  let data;
  try {
    data = await request.json();
  } catch {
    return errorJson("Pedido inválido.", 400);
  }

  if (data && typeof data.website === "string" && data.website.trim() !== "") {
    return json({ ok: true, comentario: null }, 201);
  }

  const page = normalizePage(data?.page || "");
  if (!page) return errorJson("Página inválida.", 400);
  const pm = page.match(/^\/b\/([^/]+)\/p\/([0-9a-f-]{36})$/);
  if (pm) {
    const post = await env.DB.prepare(
      "SELECT id, author_deleted_at FROM posts WHERE id = ? AND community = ? AND hidden = 0"
    )
      .bind(pm[2], pm[1])
      .first();
    if (!post) return errorJson("Postagem não encontrada.", 404);
    if (post.author_deleted_at) return errorJson("Comentários fechados: a postagem foi excluída pelo autor.", 403);
  }

  const body = sanitizeBody(data?.body);
  if (!body) return errorJson("Escreva um comentário.", 400);
  if (body.length > BODY_MAX) {
    return errorJson(`Comentário longo demais (máx. ${BODY_MAX} caracteres).`, 400);
  }

  const session = await getSessionUser(request, env);
  const comoAnon = Boolean(session && data?.anonimo === true);
  const name = comoAnon ? ANON_NAME : session ? session.username : sanitizeName(data?.name);
  const userId = session && !comoAnon ? session.id : null;
  const anonBy = comoAnon ? session.id : null;
  const anonBadge = comoAnon ? await anonBadgeAtPost(env.DB, session, communityOfPage(page)) : null;

  let parentId = data?.parent_id ? String(data.parent_id).trim() : null;
  if (parentId) {
    if (!/^[0-9a-f-]{36}$/i.test(parentId)) return errorJson("Resposta inválida.", 400);
    const parent = await env.DB.prepare(
      "SELECT id, page, parent_id, hidden, author_deleted_at FROM comments WHERE id = ?"
    )
      .bind(parentId)
      .first();
    if (!parent || parent.page !== page || parent.hidden) {
      return errorJson("O comentário original não foi encontrado.", 400);
    }
    if (parent.author_deleted_at) return errorJson("Não é possível responder a um comentário excluído.", 400);
    let depth = 1;
    let walk = parent;
    while (walk.parent_id) {
      depth += 1;
      if (depth > 20) return errorJson("Esta thread já é profunda demais.", 400);
      walk = await env.DB.prepare(
        "SELECT id, page, parent_id, hidden FROM comments WHERE id = ?"
      )
        .bind(walk.parent_id)
        .first();
      if (!walk || walk.page !== page || walk.hidden) {
        return errorJson("O comentário original não foi encontrado.", 400);
      }
    }
  } else {
    parentId = null;
  }

  const ipHash = await hashIp(request, env);
  if (!session) {
    const ban = await activeBan(env.DB, ipHash, communityOfPage(page));
    if (ban) return json({ erro: banMessage(ban), banida: true, ate: ban.expires_at }, 403);
    const ts = await verifyTurnstile(request, env, data?.turnstile, "comentario");
    if (!ts.ok) return json({ erro: TURNSTILE_ERRO, turnstile: true, codigos: ts.codes }, 403);
  }
  const rateMsg = await checkPostRate(env.DB, ipHash);
  if (rateMsg) return errorJson(rateMsg, 429);

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO comments (id, page, parent_id, name, body, created_at, hidden, ip_hash, user_id, anon_by, anon_badge)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`
  )
    .bind(id, page, parentId, name, body, createdAt, ipHash, userId, anonBy, anonBadge)
    .run();
  await recordRate(env.DB, ipHash, "post");

  const comentario = await formatComment(env.DB, {
    id,
    page,
    parent_id: parentId,
    name,
    body,
    created_at: createdAt,
    username: userId ? session.username : null,
    is_admin: userId ? session.is_admin : 0,
    b_admin_flag: userId && (await isBAdmin(env.DB, session, communityOfPage(page))) ? 1 : 0,
    is_primordial: userId ? session.is_primordial : 0,
    primordial_n: userId ? session.primordial_n : null,
    ...(await (async () => { const a = userId ? await readAvatar(env.DB, session.id) : null; return { avatar: a ? a.arte : null, avatar_colors: a ? a.cores : null }; })()),
    user_id: userId,
    anon_by: anonBy,
    anon_badge: anonBadge,
  }, session);
  return json({ ok: true, comentario }, 201);
}
