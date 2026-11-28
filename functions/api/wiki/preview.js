// POST /api/wiki/preview { corpo } -> { html }: prévia do texto no editor (só quem pode editar).
import { json, errorJson } from "../../_lib/shared.js";
import { guarda, lerJson, limitar, limpaCorpo, LIMITES } from "../../_lib/wiki.js";
import { renderMarkdown } from "../../_lib/wiki-md.js";

export async function onRequestPost({ request, env }) {
  const g = await guarda(request, env, "editor");
  if (g.resp) return g.resp;
  const body = await lerJson(request);
  if (!body) return errorJson("Pedido inválido.", 400);
  const corpo = limpaCorpo(body.corpo);
  if (corpo.length > LIMITES.corpo) return errorJson("Texto grande demais.", 413);
  if (await limitar(env.DB, g.w, "wiki_prev", 60, 60000)) return errorJson("Muitas prévias seguidas. Espere um instante.", 429);
  return json({ html: renderMarkdown(corpo, { cartoes: "" }).html });
}
