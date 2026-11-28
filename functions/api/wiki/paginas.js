// POST /api/wiki/paginas -> cria uma página (só ADM do site).
import { json, errorJson } from "../../_lib/shared.js";
import {
  guarda, lerJson, limitar, validarConteudo, validarGrupo, validarSlug, validarResumoEdicao, novoId, getPagina,
} from "../../_lib/wiki.js";

export async function onRequestPost({ request, env }) {
  const g = await guarda(request, env, "adm");
  if (g.resp) return g.resp;
  const w = g.w;
  const b = await lerJson(request);
  if (!b) return errorJson("Pedido inválido.", 400);
  const s = validarSlug(b.slug);
  if (s.erro) return errorJson(s.erro, 400);
  const c = validarConteudo(b);
  if (c.erro) return errorJson(c.erro, 400);
  const gr = validarGrupo(b.grupo);
  if (gr.erro) return errorJson(gr.erro, 400);
  const re = validarResumoEdicao(b.resumo_edicao);
  if (re.erro) return errorJson(re.erro, 400);
  let ordem = b.ordem === "" || b.ordem == null ? null : Number(b.ordem);
  if (ordem !== null && (!Number.isInteger(ordem) || ordem < 0 || ordem > 9999)) return errorJson("A ordem deve ser um número inteiro de 0 a 9999.", 400);
  if (await limitar(env.DB, w, "wiki_nova", 20, 3600000)) return errorJson("Limite de páginas novas por hora atingido.", 429);
  if (await getPagina(env.DB, s.slug)) return errorJson("Já existe uma página com esse endereço.", 409);
  if (ordem === null) {
    const row = await env.DB.prepare("SELECT COALESCE(MAX(ordem), 0) AS m FROM wiki_paginas").first();
    ordem = Math.min(9999, Number(row?.m || 0) + 10);
  }
  const id = novoId();
  const agora = new Date().toISOString();
  const f = c.campos;
  const nome = w.autor || "ADM";
  try {
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO wiki_paginas (slug, titulo, nav, grupo, resumo, ordem, corpo, oculta, rev_id, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`
      ).bind(s.slug, f.titulo, f.nav, gr.grupo, f.resumo, ordem, f.corpo, id, agora, agora),
      env.DB.prepare(
        `INSERT INTO wiki_revisoes (id, slug, tipo, titulo, nav, grupo, resumo, ordem, corpo, autor_id, autor_nome, resumo_edicao, criado_em) VALUES (?, ?, 'criacao', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(id, s.slug, f.titulo, f.nav, gr.grupo, f.resumo, ordem, f.corpo, w.autorId, nome, re.texto || "Página criada", agora),
    ]);
  } catch {
    return errorJson("Já existe uma página com esse endereço.", 409);
  }
  return json({ ok: true, slug: s.slug, url: `/wiki/${s.slug}/`, rev_id: id }, 201);
}
