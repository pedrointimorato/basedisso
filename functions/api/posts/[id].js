import { errorJson, json } from "../../_lib/shared.js";
import { UUID_RE, publicPost } from "../../_lib/comunidades.js";
import { getVisiblePost } from "../../_lib/posts.js";

export async function onRequestGet(context) {
  const { env, params } = context;
  const id = params.id || "";
  if (!UUID_RE.test(id)) return errorJson("Identificador inválido.", 400);
  if (!env.DB) return errorJson("Serviço de postagens indisponível.", 503);
  const row = await getVisiblePost(env.DB, id);
  if (!row || row.hidden) return errorJson("Postagem não encontrada.", 404);
  return json({ postagem: publicPost(row) });
}
