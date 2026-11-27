// MOR-39: GET /api/moderation/bavatar → b/ que este ADM gere, cada uma com o avatar ASCII atual e as camadas (para o editor).
// Salvar/remover: PUT/DELETE /api/comunidades/<b>/avatar.
import { errorJson, json } from "../../_lib/shared.js";
import { canModerate, getAdminContext } from "../../_lib/admins.js";
import { listCommunitiesDb } from "../../_lib/comunidades.js";
import { B_AVATAR_LIMITS } from "../../_lib/b-avatar.js";
import { layersOut, maskFor } from "../../_lib/ascii.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  const ctx = await getAdminContext(request, env);
  if (!ctx.loggedIn) return errorJson("Não autorizado.", 401);
  if (!ctx.any) return errorJson("Apenas ADMs.", 403);
  const all = (await listCommunitiesDb(env.DB)).filter((c) => canModerate(ctx, c.slug));
  const rows = {};
  try {
    const { results } = await env.DB.prepare("SELECT slug, art, colors, layers, updated_at FROM community_avatar").all();
    for (const r of results || []) rows[r.slug] = r;
  } catch { /* tabela ausente */ }
  const comunidades = all.map((c) => {
    const r = rows[c.slug];
    return { slug: c.slug, nome: c.name || c.slug, avatar: r && r.art ? { arte: r.art, cores: maskFor(r.art, r.colors), atualizado_em: r.updated_at } : null, camadas: r ? layersOut(r) : null };
  });
  return json({ comunidades, site: Boolean(ctx.site), limites: { linhas: B_AVATAR_LIMITS.lines, colunas: B_AVATAR_LIMITS.cols } }, 200, { "Cache-Control": "no-store" });
}
