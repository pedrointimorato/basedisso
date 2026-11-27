import { attachTags, insertTagStatements, publicTag, tagsOf, validateTagIds } from "../../../_lib/etiquetas.js";
import { attachVotes } from "../../../_lib/votos.js";
import {
  BODY_MAX,
  checkPostRate,
  errorJson,
  hashIp,
  isSameOrigin,
  json,
  recordRate,
  sanitizeBody,
  sanitizeName,
} from "../../../_lib/shared.js";
import { getSessionUser } from "../../../_lib/auth.js";
import { canModerate, getAdminContext, isSiteAdmin } from "../../../_lib/admins.js";
import { activeBan, attachConnections, banResponse } from "../../../_lib/conexoes.js";
import { TURNSTILE_ERRO, verifyTurnstile } from "../../../_lib/turnstile.js";
import { attachAnonAvatar } from "../../../_lib/anonimo.js";
import { ANON_NAME, anonBadgeAtPost, isBAdmin, isOwn, realAuthors, withRealAuthor } from "../../../_lib/anonimo.js";
import {
  getCommunityDb,
  publicPost,
  sanitizeTitle,
  sanitizeLink,
  TITLE_MAX,
} from "../../../_lib/comunidades.js";
import { normalizeSort, listVisiblePosts, getVisiblePost } from "../../../_lib/posts.js";
import { cleanPollInput, deletePoll, pollStatements } from "../../../_lib/enquete.js";

export async function onRequestGet(context) {
  const { env, params, request } = context;
  const sort = normalizeSort(new URL(request.url).searchParams.get("sort"));
  const community = await getCommunityDb(env.DB, params.slug);
  if (!community) return errorJson("Comunidade não encontrada.", 404);
  if (!env.DB) return json({ postagens: [] });
  const viewer = await getSessionUser(request, env);
  const ctx = viewer ? await getAdminContext(request, env) : null;
  const tagRaw = String(new URL(request.url).searchParams.get("etiqueta") || "").toLowerCase().trim();
  let filtro = null;
  if (tagRaw) {
    if (!/^[a-z0-9-]{1,24}$/.test(tagRaw)) return errorJson("Etiqueta inválida.", 400);
    const t = await env.DB.prepare("SELECT id, scope, name, slug, color, description FROM tags WHERE slug = ? AND active = 1 AND (scope = 'site' OR scope = ?) ORDER BY (scope = 'site') DESC LIMIT 1").bind(tagRaw, community.slug).first().catch(() => null);
    if (!t) return json({ sort, postagens: [], pode_fixar: false, ver_votos: false, etiqueta: { slug: tagRaw, nome: tagRaw, cor: "0", inexistente: true } });
    filtro = publicTag(t);
  }
  const rows = await listVisiblePosts(env.DB, community.slug, 100, sort, filtro ? filtro.slug : null);
  const reais = await realAuthors(env.DB, rows, ctx, (r) => r.community);
  const posts = rows.map((row) => withRealAuthor(publicPost(row, { proprio: isOwn(row, viewer) }), reais));
  await attachConnections(env.DB, rows, posts, ctx, (r) => r.community);
  await attachAnonAvatar(env.DB, posts);
  await attachVotes(env.DB, "post", posts, viewer);
  await attachTags(env.DB, "post", posts);
  const podeFixar = Boolean(ctx && ctx.any && canModerate(ctx, community.slug));
  return json({ sort, postagens: posts, pode_fixar: podeFixar, ver_votos: podeFixar, pode_etiquetar: podeFixar, etiqueta: filtro });
}

export async function onRequestPost(context) {
  const { request, env, params } = context;
  const community = await getCommunityDb(env.DB, params.slug);
  if (!community) return errorJson("Comunidade não encontrada.", 404);
  if (!env.DB) return errorJson("Serviço de postagens indisponível.", 503);
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);

  let data;
  try {
    data = await request.json();
  } catch {
    return errorJson("Pedido inválido.", 400);
  }

  if (data && typeof data.website === "string" && data.website.trim() !== "") {
    return json({ ok: true, postagem: null }, 201);
  }

  const title = sanitizeTitle(data?.title);
  if (!title) return errorJson("Informe um título.", 400);
  if (title.length > TITLE_MAX) {
    return errorJson(`Título longo demais (máx. ${TITLE_MAX} caracteres).`, 400);
  }

  const body = sanitizeBody(data?.body || "");
  if (body.length > BODY_MAX) {
    return errorJson(`Texto longo demais (máx. ${BODY_MAX} caracteres).`, 400);
  }

  const link = sanitizeLink(data?.link);
  if (link === false) return errorJson("Link inválido. Use um endereço http ou https.", 400);
  const poll = cleanPollInput(data?.enquete);
  if (poll && poll.erro) return errorJson(poll.erro, 400);
  if (!body && !link && !poll) {
    return errorJson("Escreva um texto, informe um link ou adicione uma enquete.", 400);
  }

  const tagsIn = await validateTagIds(env.DB, data?.etiquetas, community.slug);
  if (tagsIn.erro) return errorJson(tagsIn.erro, 400);

  const session = await getSessionUser(request, env);
  const comoAnon = Boolean(session && data?.anonimo === true);
  const name = comoAnon ? ANON_NAME : session ? session.username : sanitizeName(data?.name);
  const userId = session && !comoAnon ? session.id : null;
  const anonBy = comoAnon ? session.id : null;
  const anonBadge = comoAnon ? await anonBadgeAtPost(env.DB, session, community.slug) : null;

  const ipHash = await hashIp(request, env);
  if (!session) {
    const ban = await activeBan(env.DB, ipHash, community.slug);
    if (ban) return json(banResponse(ban), 403);
    const ts = await verifyTurnstile(request, env, data?.turnstile, "postagem");
    if (!ts.ok) return json({ erro: TURNSTILE_ERRO, turnstile: true, codigos: ts.codes }, 403);
  }
  const rateMsg = await checkPostRate(env.DB, ipHash);
  if (rateMsg) return errorJson(rateMsg, 429);

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO posts (id, community, title, body, link, name, user_id, created_at, hidden, sticky, ip_hash, anon_by, anon_badge)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)`
  )
    .bind(id, community.slug, title, body, link, name, userId, createdAt, ipHash, anonBy, anonBadge)
    .run();
  if (poll) {
    try {
      await env.DB.batch(pollStatements(env.DB, id, poll, createdAt));
    } catch (e) {
      await env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();
      await deletePoll(env.DB, id);
      return errorJson("Não foi possível criar a enquete.", 500);
    }
  }
  if (tagsIn.ids.length) await env.DB.batch(insertTagStatements(env.DB, "post", id, tagsIn.ids, "autor", createdAt));
  await recordRate(env.DB, ipHash, "post");

  const row = await getVisiblePost(env.DB, id);
  return json({ ok: true, postagem: publicPost(row || {
    id,
    community: community.slug,
    title,
    body,
    link,
    name,
    created_at: createdAt,
    sticky: 0,
    username: userId ? session.username : null,
    is_admin: userId ? session.is_admin : 0,
    b_admin_flag: userId && (await isBAdmin(env.DB, session, community.slug)) ? 1 : 0,
    is_primordial: userId ? session.is_primordial : 0,
    primordial_n: userId ? session.primordial_n : null,
    user_id: userId,
    anon_by: anonBy,
    anon_badge: anonBadge,
    comment_count: 0,
  }, { proprio: Boolean(session) }), etiquetas: (await tagsOf(env.DB, "post", [id]))[id] || [] }, 201);
}
