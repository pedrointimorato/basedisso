import { errorJson, isSameOrigin, json } from "../../../_lib/shared.js";
import { getAdminContext } from "../../../_lib/admins.js";
import { normalizeUsername } from "../../../_lib/auth.js";

// DELETE /api/moderation/ascii/:nome — ADM do site remove a arte ASCII de um perfil.
export async function onRequestDelete(context) {
  const { request, env, params } = context;
  const ctx = await getAdminContext(request, env);
  if (!ctx.loggedIn) return errorJson("Não autorizado.", 401);
  if (!ctx.site) return errorJson("Apenas ADMs do site.", 403);
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  const parsed = normalizeUsername(String(params.name || "").replace(/^(>>|@)/, ""));
  if (!parsed) return errorJson("Nome inválido.", 400);
  const user = await env.DB.prepare("SELECT id, username FROM users WHERE username_lc = ?").bind(parsed.username_lc).first();
  if (!user) return errorJson("Usuário não encontrado.", 404);
  const del = await env.DB.prepare("DELETE FROM profile_ascii WHERE user_id = ? RETURNING user_id").bind(user.id).first();
  if (!del) return errorJson("Este perfil não tem arte ASCII.", 404);
  return json({ ok: true, removida: { username: user.username } });
}
