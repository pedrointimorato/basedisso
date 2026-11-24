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
import {
  getCommunityDb,
  publicPost,
  sanitizeTitle,
  sanitizeLink,
  TITLE_MAX,
} from "../../../_lib/comunidades.js";
import { listVisiblePosts, getVisiblePost } from "../../../_lib/posts.js";

export async function onRequestGet(context) {
  const { env, params } = context;
  const community = await getCommunityDb(env.DB, params.slug);
  if (!community) return errorJson("Comunidade não encontrada.", 404);
  if (!env.DB) return json({ postagens: [] });
  const posts = (await listVisiblePosts(env.DB, community.slug)).map((row) => publicPost(row));
  return json({ postagens: posts });
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
  if (!body && !link) {
    return errorJson("Escreva um texto ou informe um link.", 400);
  }

  const session = await getSessionUser(request, env);
  const name = session ? session.username : sanitizeName(data?.name);
  const userId = session ? session.id : null;

  const ipHash = await hashIp(request, env);
  const rateMsg = await checkPostRate(env.DB, ipHash);
  if (rateMsg) return errorJson(rateMsg, 429);

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO posts (id, community, title, body, link, name, user_id, created_at, hidden, sticky, ip_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`
  )
    .bind(id, community.slug, title, body, link, name, userId, createdAt, ipHash)
    .run();
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
    username: session ? session.username : null,
    is_admin: session ? session.is_admin : 0,
    is_primordial: session ? session.is_primordial : 0,
    primordial_n: session ? session.primordial_n : null,
    comment_count: 0,
  }) }, 201);
}
