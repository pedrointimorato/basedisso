// GET /api/etiquetas?b=<slug>  ou  ?page=<página de comentários>
// Etiquetas ativas que podem ser escolhidas ali (as do site + as da b/). Público: não tem dados de contas.
import { errorJson, json, normalizePage } from "../_lib/shared.js";
import { SLUG_RE } from "../_lib/comunidades.js";
import { TAGS_MAX_ITEM, availableTags, publicTag, scopeOfPage } from "../_lib/etiquetas.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB) return json({ etiquetas: [], max: TAGS_MAX_ITEM });
  const url = new URL(request.url);
  let slug = null;
  if (url.searchParams.has("b")) {
    slug = String(url.searchParams.get("b") || "").toLowerCase();
    if (!SLUG_RE.test(slug)) return errorJson("Comunidade inválida.", 400);
  } else if (url.searchParams.has("page")) {
    const page = normalizePage(url.searchParams.get("page") || "");
    if (!page) return errorJson("Página inválida.", 400);
    slug = scopeOfPage(page);
  }
  const rows = await availableTags(env.DB, slug);
  return json({ escopo: slug || "site", max: TAGS_MAX_ITEM, etiquetas: rows.map(publicTag) });
}
