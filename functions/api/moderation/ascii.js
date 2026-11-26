import { errorJson, json } from "../../_lib/shared.js";
import { getAdminContext } from "../../_lib/admins.js";

// GET /api/moderation/ascii — perfis com arte ASCII (só ADMs do site).
export async function onRequestGet(context) {
  const { request, env } = context;
  const ctx = await getAdminContext(request, env);
  if (!ctx.loggedIn) return errorJson("Não autorizado.", 401);
  if (!ctx.site) return errorJson("Apenas ADMs do site.", 403);
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  const { results } = await env.DB.prepare(
    `SELECT u.username, a.art, a.frame, a.updated_at
     FROM profile_ascii a JOIN users u ON u.id = a.user_id
     ORDER BY a.updated_at DESC LIMIT 200`
  ).all();
  return json({
    artes: (results || []).map((r) => ({
      username: r.username,
      arte: r.art,
      moldura: r.frame === "nenhuma" ? "nenhuma" : "simples",
      atualizada_em: r.updated_at,
    })),
  });
}
