import { errorJson, json } from "../../../../_lib/shared.js";
import { cleanLivroInput, editorOf, LIMITS, readBiblia, slugify } from "../../../../_lib/biblia.js";
import { body, guard } from "../../../../_lib/biblia-guard.js";

// POST /api/s/biblia-amarela/livros  { titulo, credito, texto, nota_pendente } → adiciona no fim
export async function onRequestPost(context) {
  const { request, env } = context;
  const g = await guard(request, env);
  if (g.res) return g.res;
  const data = await body(request);
  if (!data) return errorJson("Pedido inválido.", 400);
  const c = cleanLivroInput(data);
  if (c.erro) return errorJson(c.erro, 400);
  const stats = await env.DB.prepare("SELECT COUNT(*) AS n, COALESCE(MAX(position), 0) AS mx FROM biblia_amarela_books").first();
  if (Number(stats.n) >= LIMITS.livros) return errorJson("Limite de livros atingido.", 400);
  const base = slugify(c.titulo);
  let id = base;
  for (let i = 2; i < 100; i++) {
    const ex = await env.DB.prepare("SELECT 1 AS ok FROM biblia_amarela_books WHERE id = ?").bind(id).first();
    if (!ex && !["a-biblia-amarela", "sumario", "comentarios"].includes(id)) break;
    id = `${base}-${i}`;
  }
  const now = new Date().toISOString();
  const who = editorOf(g.ctx);
  await env.DB.prepare(
    `INSERT INTO biblia_amarela_books (id, position, titulo, credito, texto, nota_pendente, created_at, updated_at, updated_by_user_id, updated_by_username)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, Number(stats.mx) + 10, c.titulo, c.credito, c.texto, c.nota_pendente, now, now, who.id, who.username)
    .run();
  return json({ ok: true, id, ...(await readBiblia(env.DB)), pode_editar: true }, 201);
}
