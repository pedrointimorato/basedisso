import { errorJson, isSameOrigin, json } from "../../_lib/shared.js";
import { getAdminContext } from "../../_lib/admins.js";
import { expireHolds } from "../../_lib/reservas.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const ctx = await getAdminContext(request, env);
  if (!ctx.loggedIn) return errorJson("Não autorizado.", 401);
  if (!ctx.site) return errorJson("Apenas ADMs do site.", 403);
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  await expireHolds(env.DB);
  const url = new URL(request.url);
  const status = (url.searchParams.get("status") || "").trim();
  let sql = `SELECT id, username, email, status, created_at, expires_at, paid_at, claimed_at,
                    primordial_n, mp_preference_id, mp_payment_id, amount_centavos, currency
             FROM reservations`;
  const binds = [];
  if (status && ["pending", "paid", "claimed", "expired"].includes(status)) {
    sql += " WHERE status = ?";
    binds.push(status);
  }
  sql += " ORDER BY created_at DESC LIMIT 200";
  const stmt = env.DB.prepare(sql);
  const { results } = binds.length ? await stmt.bind(...binds).all() : await stmt.all();
  return json({ ok: true, reservas: results || [] });
}

// Exclui TODAS as reservas expiradas: DELETE /api/moderation/reservas?expired=1
export async function onRequestDelete(context) {
  const { request, env } = context;
  const ctx = await getAdminContext(request, env);
  if (!ctx.loggedIn) return errorJson("Não autorizado.", 401);
  if (!ctx.site) return errorJson("Apenas ADMs do site.", 403);
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  const url = new URL(request.url);
  if (url.searchParams.get("expired") !== "1") return errorJson("Use ?expired=1 para excluir as reservas expiradas.", 400);
  await expireHolds(env.DB);
  const res = await env.DB.prepare("DELETE FROM reservations WHERE status = 'expired'").run();
  return json({ ok: true, removidas: Number(res?.meta?.changes || 0) });
}
