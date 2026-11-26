import { errorJson, json } from "../../_lib/shared.js";
import { UUID_RE, publicPost } from "../../_lib/comunidades.js";
import { getVisiblePost } from "../../_lib/posts.js";
import { authorGuard, deleteOwnPost } from "../../_lib/exclusao.js";

export async function onRequestGet(context) {
  const { env, params } = context;
  const id = params.id || "";
  if (!UUID_RE.test(id)) return errorJson("Identificador inválido.", 400);
  if (!env.DB) return errorJson("Serviço de postagens indisponível.", 503);
  const row = await getVisiblePost(env.DB, id);
  if (!row || row.hidden) return errorJson("Postagem não encontrada.", 404);
  return json({ postagem: publicPost(row) });
}

// DELETE /api/posts/:id — o autor (logado) exclui a própria postagem.
export async function onRequestDelete(context) {
  const { request, env, params } = context;
  const g = await authorGuard(request, env);
  if (g.res) return g.res;
  const id = params.id || "";
  if (!UUID_RE.test(id)) return errorJson("Identificador inválido.", 400);
  const r = await deleteOwnPost(env.DB, g.user, id);
  if (!r.ok) return errorJson(r.erro, r.status);
  return json({ ok: true, modo: r.modo, comunidade: r.community });
}
