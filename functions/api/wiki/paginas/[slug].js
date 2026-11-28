// PUT /api/wiki/paginas/<slug>  -> salva uma edição (editor autorizado ou ADM); cria uma revisão.
// DELETE /api/wiki/paginas/<slug> -> apaga uma página já oculta (só ADM; a inicial não pode ser apagada).
import { json, errorJson } from "../../../_lib/shared.js";
import {
  guarda, lerJson, limitar, validarConteudo, validarGrupo, validarResumoEdicao, getPagina, gravarRevisao, SLUG_RE, REV_RE,
} from "../../../_lib/wiki.js";

export async function onRequestPut({ request, env, params }) {
  const g = await guarda(request, env, "editor");
  if (g.resp) return g.resp;
  const w = g.w;
  const slug = String(params.slug || "").toLowerCase();
  if (!SLUG_RE.test(slug)) return errorJson("Página não encontrada.", 404);
  const b = await lerJson(request);
  if (!b) return errorJson("Pedido inválido.", 400);
  const p = await getPagina(env.DB, slug);
  if (!p) return errorJson("Página não encontrada.", 404);
  const c = validarConteudo(b);
  if (c.erro) return errorJson(c.erro, 400);
  const re = validarResumoEdicao(b.resumo_edicao);
  if (re.erro) return errorJson(re.erro, 400);
  const base = String(b.base_rev || "");
  if (!REV_RE.test(base)) return errorJson("Pedido inválido.", 400);
  const novo = { ...p, ...c.campos };
  // grupo e ordem: só ADM (editores comuns ignoram esses campos)
  if (w.adm) {
    if (b.grupo != null) {
      const gr = validarGrupo(b.grupo);
      if (gr.erro) return errorJson(gr.erro, 400);
      novo.grupo = gr.grupo;
    }
    if (b.ordem !== "" && b.ordem != null) {
      const o = Number(b.ordem);
      if (!Number.isInteger(o) || o < 0 || o > 9999) return errorJson("A ordem deve ser um número inteiro de 0 a 9999.", 400);
      novo.ordem = o;
    }
  }
  if (["titulo", "nav", "resumo", "corpo", "grupo", "ordem"].every((k) => String(novo[k]) === String(p[k]))) return errorJson("Nada mudou.", 400);
  if (await limitar(env.DB, w, "wiki_edit", 30, 3600000)) return errorJson("Limite de edições por hora atingido. Tente mais tarde.", 429);
  if (p.rev_id !== base) {
    return json({ erro: "Alguém salvou esta página enquanto você editava. Copie o seu texto, abra a versão atual e refaça a alteração.", conflito: true, rev_id: p.rev_id }, 409);
  }
  const r = await gravarRevisao(env.DB, w, novo, "edicao", re.texto, base);
  if (r.conflito) return json({ erro: "Alguém salvou esta página enquanto você editava. Copie o seu texto, abra a versão atual e refaça a alteração.", conflito: true }, 409);
  return json({ ok: true, rev_id: r.id, url: slug === "index" ? "/wiki/" : `/wiki/${slug}/` });
}

export async function onRequestDelete({ request, env, params }) {
  const g = await guarda(request, env, "adm");
  if (g.resp) return g.resp;
  const slug = String(params.slug || "").toLowerCase();
  if (!SLUG_RE.test(slug)) return errorJson("Página não encontrada.", 404);
  if (slug === "index") return errorJson("A página inicial não pode ser apagada.", 400);
  const p = await getPagina(env.DB, slug);
  if (!p) return errorJson("Página não encontrada.", 404);
  if (!p.oculta) return errorJson("Oculte a página antes de apagar.", 409);
  if (await limitar(env.DB, g.w, "wiki_apagar", 20, 3600000)) return errorJson("Limite atingido. Tente mais tarde.", 429);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM wiki_revisoes WHERE slug = ?").bind(slug),
    env.DB.prepare("DELETE FROM wiki_paginas WHERE slug = ?").bind(slug),
  ]);
  return json({ ok: true });
}
