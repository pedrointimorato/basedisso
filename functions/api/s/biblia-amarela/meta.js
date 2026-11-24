import { errorJson, json } from "../../../_lib/shared.js";
import { cleanMetaInput, editorOf, readBiblia } from "../../../_lib/biblia.js";
import { body, guard } from "../../../_lib/biblia-guard.js";

// PUT /api/s/biblia-amarela/meta  { titulo, titulo_capa, subtitulo, intro, fontes }
export async function onRequestPut(context) {
  const { request, env } = context;
  const g = await guard(request, env);
  if (g.res) return g.res;
  const data = await body(request);
  if (!data) return errorJson("Pedido inválido.", 400);
  const c = cleanMetaInput(data);
  if (c.erro) return errorJson(c.erro, 400);
  const who = editorOf(g.ctx);
  await env.DB.prepare(
    `UPDATE biblia_amarela_meta SET titulo = ?, titulo_capa = ?, subtitulo = ?, intro = ?, fontes = ?,
       updated_at = ?, updated_by_user_id = ?, updated_by_username = ? WHERE id = 'main'`
  )
    .bind(c.titulo, c.titulo_capa, c.subtitulo, c.intro, c.fontes, new Date().toISOString(), who.id, who.username)
    .run();
  return json({ ok: true, ...(await readBiblia(env.DB)), pode_editar: true });
}
