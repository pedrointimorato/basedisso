import { errorJson, json } from "../../../../_lib/shared.js";
import { cleanLivroInput, editorOf, readBiblia } from "../../../../_lib/biblia.js";
import { body, guard } from "../../../../_lib/biblia-guard.js";

// PUT /api/s/biblia-amarela/livros/:id  { titulo, credito, texto, nota_pendente }
// Texto vazio = livro "ainda não escrito"; com texto = livro escrito.
export async function onRequestPut(context) {
  const { request, env, params } = context;
  const g = await guard(request, env);
  if (g.res) return g.res;
  const data = await body(request);
  if (!data) return errorJson("Pedido inválido.", 400);
  const c = cleanLivroInput(data);
  if (c.erro) return errorJson(c.erro, 400);
  const who = editorOf(g.ctx);
  const r = await env.DB.prepare(
    `UPDATE biblia_amarela_books SET titulo = ?, credito = ?, texto = ?, nota_pendente = ?, updated_at = ?, updated_by_user_id = ?, updated_by_username = ?
     WHERE id = ? RETURNING id`
  )
    .bind(c.titulo, c.credito, c.texto, c.nota_pendente, new Date().toISOString(), who.id, who.username, String(params.id))
    .first();
  if (!r) return errorJson("Livro não encontrado.", 404);
  return json({ ok: true, ...(await readBiblia(env.DB)), pode_editar: true });
}

// DELETE /api/s/biblia-amarela/livros/:id
export async function onRequestDelete(context) {
  const { request, env, params } = context;
  const g = await guard(request, env);
  if (g.res) return g.res;
  const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM biblia_amarela_books").first();
  if (Number(n.n) <= 1) return errorJson("A Bíblia precisa de pelo menos um livro.", 409);
  const r = await env.DB.prepare("DELETE FROM biblia_amarela_books WHERE id = ? RETURNING id").bind(String(params.id)).first();
  if (!r) return errorJson("Livro não encontrado.", 404);
  return json({ ok: true, removido: r.id, ...(await readBiblia(env.DB)), pode_editar: true });
}
