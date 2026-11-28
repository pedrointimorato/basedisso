// DELETE /api/wiki/editores/<nome> -> tira a autorização de edição de uma conta (só ADM do site).
import { json, errorJson } from "../../../_lib/shared.js";
import { findUserByRef } from "../../../_lib/admins.js";
import { guarda, limitar, listarEditores } from "../../../_lib/wiki.js";

export async function onRequestDelete({ request, env, params }) {
  const g = await guarda(request, env, "adm");
  if (g.resp) return g.resp;
  const u = await findUserByRef(env.DB, decodeURIComponent(String(params.nome || "")));
  if (!u) return errorJson("Não existe uma conta com esse nome.", 404);
  if (await limitar(env.DB, g.w, "wiki_editores", 40, 3600000)) return errorJson("Limite atingido. Tente mais tarde.", 429);
  const r = await env.DB.prepare("DELETE FROM wiki_editores WHERE user_id = ?").bind(u.id).run();
  if (!r.meta || r.meta.changes < 1) return errorJson("Essa conta não estava autorizada.", 404);
  return json({ ok: true, editores: await listarEditores(env.DB) });
}
