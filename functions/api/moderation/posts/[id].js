import { errorJson, isAdmin, isSameOrigin, json } from "../../../_lib/shared.js";
import { UUID_RE, postPageKey } from "../../../_lib/comunidades.js";

async function deleteCommentsOnPage(db, page) {
  const { results } = await db
    .prepare("SELECT id, parent_id FROM comments WHERE page = ?")
    .bind(page)
    .all();
  const rows = results || [];
  if (!rows.length) return;
  const ids = new Set(rows.map((r) => r.id));
  // children first-ish: delete all on this page
  await db.batch(
    [...ids].map((cid) => db.prepare("DELETE FROM comments WHERE id = ?").bind(cid))
  );
}

export async function onRequestPatch(context) {
  const { request, env, params } = context;
  if (!(await isAdmin(request, env))) return errorJson("Não autorizado.", 401);
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  if (!env.DB) return errorJson("Serviço de postagens indisponível.", 503);
  const id = params.id;
  if (!UUID_RE.test(id)) return errorJson("Identificador inválido.", 400);
  let data;
  try {
    data = await request.json();
  } catch {
    return errorJson("Pedido inválido.", 400);
  }
  if (typeof data?.hidden !== "boolean") return errorJson("Informe hidden: true ou false.", 400);
  const existing = await env.DB.prepare("SELECT id FROM posts WHERE id = ?").bind(id).first();
  if (!existing) return errorJson("Postagem não encontrada.", 404);
  await env.DB.prepare("UPDATE posts SET hidden = ? WHERE id = ?")
    .bind(data.hidden ? 1 : 0, id)
    .run();
  return json({ ok: true, hidden: data.hidden });
}

export async function onRequestDelete(context) {
  const { request, env, params } = context;
  if (!(await isAdmin(request, env))) return errorJson("Não autorizado.", 401);
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  if (!env.DB) return errorJson("Serviço de postagens indisponível.", 503);
  const id = params.id;
  if (!UUID_RE.test(id)) return errorJson("Identificador inválido.", 400);
  const existing = await env.DB.prepare("SELECT id, community FROM posts WHERE id = ?")
    .bind(id)
    .first();
  if (!existing) return errorJson("Postagem não encontrada.", 404);
  await deleteCommentsOnPage(env.DB, postPageKey(existing.community, id));
  await env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();
  return json({ ok: true, apagado: true });
}
