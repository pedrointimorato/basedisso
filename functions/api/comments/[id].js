import { sweepMedia } from "../../_lib/midia.js";
import { errorJson, json } from "../../_lib/shared.js";
import { authorGuard, deleteOwnComment } from "../../_lib/exclusao.js";

// DELETE /api/comments/:id — o autor (logado) exclui o próprio comentário.
export async function onRequestDelete(context) {
  const { request, env, params } = context;
  const g = await authorGuard(request, env);
  if (g.res) return g.res;
  const id = String(params.id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return errorJson("Identificador inválido.", 400);
  const r = await deleteOwnComment(env.DB, g.user, id);
  if (!r.ok) return errorJson(r.erro, r.status);
  context.waitUntil(sweepMedia(env)); // MOR-38: arquivos de itens apagados/excluídos saem do R2
  return json({ ok: true, modo: r.modo });
}
