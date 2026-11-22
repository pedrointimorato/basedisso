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

async function formatComment(db, row) {
  const mencoes = await lookupMentions(db, row.body);
  const usuario = row.username
    ? { username: row.username, is_admin: Boolean(row.is_admin) }
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
  };
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB) return errorJson("Serviço de comentários indisponível.", 503);
  const url = new URL(request.url);
  const page = normalizePage(url.searchParams.get("page") || "");
  if (!page) return errorJson("Página inválida.", 400);
  const { results } = await env.DB.prepare(
    `SELECT c.id, c.page, c.parent_id, c.name, c.body, c.created_at, c.user_id,
            u.username, u.is_admin
     FROM comments c
     LEFT JOIN users u ON u.id = c.user_id
     LEFT JOIN comments p ON c.parent_id = p.id
     WHERE c.page = ? AND c.hidden = 0
       AND (c.parent_id IS NULL OR (p.id IS NOT NULL AND p.hidden = 0))
     ORDER BY c.created_at ASC
     LIMIT 500`
  )
    .bind(page)
    .all();
  const comentarios = [];
  for (const row of results || []) {
    comentarios.push(await formatComment(env.DB, row));
  }
  return json({ comentarios });
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

  const body = sanitizeBody(data?.body);
  if (!body) return errorJson("Escreva um comentário.", 400);
  if (body.length > BODY_MAX) {
    return errorJson(`Comentário longo demais (máx. ${BODY_MAX} caracteres).`, 400);
  }

  const session = await getSessionUser(request, env);
  const name = session ? session.username : sanitizeName(data?.name);
  const userId = session ? session.id : null;

  let parentId = data?.parent_id ? String(data.parent_id).trim() : null;
  if (parentId) {
    if (!/^[0-9a-f-]{36}$/i.test(parentId)) return errorJson("Resposta inválida.", 400);
    const parent = await env.DB.prepare(
      "SELECT id, page, parent_id, hidden FROM comments WHERE id = ?"
    )
      .bind(parentId)
      .first();
    if (!parent || parent.page !== page || parent.hidden) {
      return errorJson("O comentário original não foi encontrado.", 400);
    }
    if (parent.parent_id) {
      return errorJson("Só é possível responder a um comentário de primeiro nível.", 400);
    }
  } else {
    parentId = null;
  }

  const ipHash = await hashIp(request, env);
  const rateMsg = await checkPostRate(env.DB, ipHash);
  if (rateMsg) return errorJson(rateMsg, 429);

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO comments (id, page, parent_id, name, body, created_at, hidden, ip_hash, user_id)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`
  )
    .bind(id, page, parentId, name, body, createdAt, ipHash, userId)
    .run();
  await recordRate(env.DB, ipHash, "post");

  const comentario = await formatComment(env.DB, {
    id,
    page,
    parent_id: parentId,
    name,
    body,
    created_at: createdAt,
    username: session ? session.username : null,
    is_admin: session ? session.is_admin : 0,
  });
  return json({ ok: true, comentario }, 201);
}
