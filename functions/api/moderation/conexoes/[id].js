import { errorJson, isSameOrigin, json } from "../../../_lib/shared.js";
import { canModerate, getAdminContext } from "../../../_lib/admins.js";

// DELETE /api/moderation/conexoes/:id — desbanir (site: qualquer; b/: só bans da própria b/).
export async function onRequestDelete(context) {
  const { request, env, params } = context;
  const ctx = await getAdminContext(request, env);
  if (!ctx.loggedIn) return errorJson("Não autorizado.", 401);
  if (!ctx.any) return errorJson("Apenas ADMs podem moderar.", 403);
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  const id = String(params.id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return errorJson("Identificador inválido.", 400);
  const ban = await env.DB.prepare("SELECT id, scope FROM connection_bans WHERE id = ?").bind(id).first();
  if (!ban) return errorJson("Banimento não encontrado.", 404);
  if (ban.scope === "site" ? !ctx.site : !canModerate(ctx, ban.scope)) return errorJson("Você não pode desfazer este banimento.", 403);
  await env.DB.prepare("DELETE FROM connection_bans WHERE id = ?").bind(id).run();
  return json({ ok: true });
}
