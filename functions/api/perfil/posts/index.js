// MOR-43: POST /api/perfil/posts  { body, midia? } — só a própria conta, logada.
import { errorJson, isSameOrigin, json, sanitizeBody, BODY_MAX, hashIp, checkPostRate, recordRate } from "../../../_lib/shared.js";
import { getSessionUser, publicUser } from "../../../_lib/auth.js";
import { getAdminContext } from "../../../_lib/admins.js";
import { attachStatement, attachMedia, validateMidiaRef } from "../../../_lib/midia.js";
import { publicProfilePost } from "../../../_lib/perfil-posts.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  const user = await getSessionUser(request, env);
  if (!user) return errorJson("Entre na sua conta para postar no perfil.", 401);

  let data;
  try { data = await request.json(); } catch { return errorJson("Pedido inválido.", 400); }
  if (!data || typeof data !== "object" || Array.isArray(data)) return errorJson("Pedido inválido.", 400);

  const body = sanitizeBody(data.body);
  if (!body) return errorJson("Escreva um texto.", 400);
  if (body.length > BODY_MAX) return errorJson(`Texto longo demais (máx. ${BODY_MAX} caracteres).`, 400);

  const querMidia = data.midia != null && data.midia !== "";
  let midiaIn = { id: null };
  if (querMidia) {
    const ctx = await getAdminContext(request, env);
    midiaIn = await validateMidiaRef(env, data.midia, user, null, ctx);
    if (midiaIn.erro) return errorJson(midiaIn.erro, midiaIn.status || 400);
  }

  const ipHash = await hashIp(request, env);
  const rateMsg = await checkPostRate(env.DB, ipHash);
  if (rateMsg) return errorJson(rateMsg, 429);

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  try {
    await env.DB.prepare(
      `INSERT INTO profile_posts (id, user_id, body, created_at, hidden, author_deleted_at, ip_hash)
       VALUES (?, ?, ?, ?, 0, NULL, ?)`
    ).bind(id, user.id, body, createdAt, ipHash).run();
  } catch {
    return errorJson("Não foi possível publicar.", 500);
  }
  if (midiaIn.id) await attachStatement(env.DB, midiaIn.id, "perfil", id, createdAt).run();
  await recordRate(env.DB, ipHash, "post");
  const items = [{ id, body, created_at: createdAt, hidden: false, usuario: publicUser(user), url: `/@${user.username}#pp-${id}`, proprio: true }];
  await attachMedia(env.DB, "perfil", items);
  return json({ ok: true, postagem: items[0] }, 201);
}
