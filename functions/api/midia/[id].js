// MOR-38: DELETE /api/midia/:id — remove o arquivo.
// Pendente: só quem enviou. Já publicado: o autor do item (com conta, inclusive em item anônimo) ou ADM do escopo.
import { errorJson, isSameOrigin, json } from "../../_lib/shared.js";
import { canModerate, communityOfPage, getAdminContext } from "../../_lib/admins.js";
import { ownerId } from "../../_lib/anonimo.js";
import { ID_RE, removeMediaRows } from "../../_lib/midia.js";

export async function onRequestDelete(context) {
  const { request, env, params } = context;
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  const ctx = await getAdminContext(request, env);
  if (!ctx.loggedIn) return errorJson("Entre na sua conta.", 401);
  const id = String(params.id || "").toLowerCase();
  if (!ID_RE.test(id)) return errorJson("Identificador inválido.", 400);
  const row = await env.DB.prepare("SELECT id, item_type, item_id, scope, r2_key, thumb_key, uploader_id FROM media WHERE id = ?").bind(id).first();
  if (!row) return errorJson("Arquivo não encontrado.", 404);
  let ok = false;
  if (!row.item_id) {
    ok = Boolean(ctx.user && row.uploader_id === ctx.user.id);
  } else {
    let item = null, slug = null;
    if (row.item_type === "post") {
      item = await env.DB.prepare("SELECT id, community, user_id, anon_by FROM posts WHERE id = ?").bind(row.item_id).first();
      slug = item ? item.community : row.scope;
    } else {
      item = await env.DB.prepare("SELECT id, page, user_id, anon_by FROM comments WHERE id = ?").bind(row.item_id).first();
      slug = item ? communityOfPage(item.page) : row.scope;
    }
    if (ctx.any && canModerate(ctx, slug)) ok = true;
    else if (ctx.user && item && ownerId(item) === ctx.user.id) ok = true;
  }
  if (!ok) return errorJson("Você não pode remover este arquivo.", 403);
  await removeMediaRows(env, [row]);
  return json({ ok: true });
}
