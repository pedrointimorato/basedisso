import { errorJson, isSameOrigin, json } from "./shared.js";
import { denyUnlessSite, getAdminContext } from "./admins.js";
import { publicCode } from "./convites.js";

export async function revokeInviteCode(context) {
  const { request, env, params } = context;
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  const ctx = await getAdminContext(request, env);
  const deny = denyUnlessSite(ctx);
  if (deny) return errorJson(deny.erro, deny.status);
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  const id = String(params.id || "");
  const row = await env.DB.prepare("SELECT * FROM invite_codes WHERE id = ?").bind(id).first();
  if (!row) return errorJson("Código não encontrado.", 404);
  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE invite_codes SET revoked_at = COALESCE(revoked_at, ?), revoked_by = COALESCE(revoked_by, ?) WHERE id = ?")
    .bind(now, ctx.user ? ctx.user.id : "token", id)
    .run();
  const updated = await env.DB.prepare("SELECT * FROM invite_codes WHERE id = ?").bind(id).first();
  return json({ ok: true, codigo: publicCode(updated) });
}

