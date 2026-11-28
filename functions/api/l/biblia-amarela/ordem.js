import { errorJson, json } from "../../../_lib/shared.js";
import { readBiblia } from "../../../_lib/biblia.js";
import { body, guard } from "../../../_lib/biblia-guard.js";

// POST /api/l/biblia-amarela/ordem  { ids: [...] } (todos os livros, na nova ordem)
export async function onRequestPost(context) {
  const { request, env } = context;
  const g = await guard(request, env);
  if (g.res) return g.res;
  const data = await body(request);
  const ids = data && Array.isArray(data.ids) ? data.ids.map(String) : null;
  if (!ids) return errorJson("Pedido inválido.", 400);
  const { results } = await env.DB.prepare("SELECT id FROM biblia_amarela_books").all();
  const atuais = (results || []).map((r) => r.id).sort();
  if (ids.length !== atuais.length || new Set(ids).size !== ids.length || [...ids].sort().join("|") !== atuais.join("|")) {
    return errorJson("A lista de livros mudou; recarregue a página.", 409);
  }
  await env.DB.batch(ids.map((id, i) => env.DB.prepare("UPDATE biblia_amarela_books SET position = ? WHERE id = ?").bind((i + 1) * 10, id)));
  return json({ ok: true, ...(await readBiblia(env.DB)), pode_editar: true });
}
