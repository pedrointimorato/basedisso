// POST /api/wiki/paginas/<slug>/reverter { rev } -> volta a página ao conteúdo de uma versão antiga (nova revisão). Só ADM.
import { json, errorJson } from "../../../../_lib/shared.js";
import { guarda, lerJson, limitar, getPagina, getRevisao, gravarRevisao, SLUG_RE, REV_RE } from "../../../../_lib/wiki.js";

export async function onRequestPost({ request, env, params }) {
  const g = await guarda(request, env, "adm");
  if (g.resp) return g.resp;
  const slug = String(params.slug || "").toLowerCase();
  if (!SLUG_RE.test(slug)) return errorJson("Página não encontrada.", 404);
  const b = await lerJson(request);
  if (!b || !REV_RE.test(String(b.rev || ""))) return errorJson("Pedido inválido.", 400);
  const p = await getPagina(env.DB, slug);
  if (!p) return errorJson("Página não encontrada.", 404);
  const rev = await getRevisao(env.DB, slug, String(b.rev));
  if (!rev) return errorJson("Versão não encontrada.", 404);
  if (rev.id === p.rev_id) return errorJson("Essa já é a versão atual.", 400);
  if (await limitar(env.DB, g.w, "wiki_edit", 30, 3600000)) return errorJson("Limite de edições por hora atingido. Tente mais tarde.", 429);
  const novo = { ...p, titulo: rev.titulo, nav: rev.nav, grupo: rev.grupo, resumo: rev.resumo, ordem: rev.ordem, corpo: rev.corpo };
  const r = await gravarRevisao(env.DB, g.w, novo, "reversao", `Revertida para a versão de ${rev.criado_em.slice(0, 16).replace("T", " ")} UTC (${String(rev.autor_nome).slice(0, 30)})`, p.rev_id);
  if (r.conflito) return json({ erro: "A página mudou agora há pouco. Recarregue e tente de novo.", conflito: true }, 409);
  return json({ ok: true, rev_id: r.id, url: slug === "index" ? "/wiki/" : `/wiki/${slug}/` });
}
