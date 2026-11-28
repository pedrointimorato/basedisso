// POST /api/wiki/paginas/<slug>/ocultar { oculta: true|false } -> esconde/mostra a página (só ADM; a inicial não se oculta).
import { json, errorJson } from "../../../../_lib/shared.js";
import { guarda, lerJson, limitar, getPagina, gravarRevisao, SLUG_RE } from "../../../../_lib/wiki.js";

export async function onRequestPost({ request, env, params }) {
  const g = await guarda(request, env, "adm");
  if (g.resp) return g.resp;
  const slug = String(params.slug || "").toLowerCase();
  if (!SLUG_RE.test(slug)) return errorJson("Página não encontrada.", 404);
  if (slug === "index") return errorJson("A página inicial não pode ser ocultada.", 400);
  const b = await lerJson(request);
  if (!b || typeof b.oculta !== "boolean") return errorJson("Pedido inválido.", 400);
  const p = await getPagina(env.DB, slug);
  if (!p) return errorJson("Página não encontrada.", 404);
  if (Boolean(p.oculta) === b.oculta) return errorJson(b.oculta ? "A página já está oculta." : "A página já está visível.", 400);
  if (await limitar(env.DB, g.w, "wiki_edit", 30, 3600000)) return errorJson("Limite de edições por hora atingido. Tente mais tarde.", 429);
  const r = await gravarRevisao(env.DB, g.w, { ...p, oculta: b.oculta ? 1 : 0 }, b.oculta ? "ocultar" : "mostrar", b.oculta ? "Página ocultada" : "Página reexibida", p.rev_id);
  if (r.conflito) return json({ erro: "A página mudou agora há pouco. Recarregue e tente de novo.", conflito: true }, 409);
  return json({ ok: true, oculta: b.oculta });
}
