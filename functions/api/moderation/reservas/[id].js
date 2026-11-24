import { errorJson, isSameOrigin, json } from "../../../_lib/shared.js";
import { getAdminContext } from "../../../_lib/admins.js";
import { markReservationPaid } from "../../../_lib/reservas.js";

export async function onRequestPost(context) {
  const { request, env, params } = context;
  const ctx = await getAdminContext(request, env);
  if (!ctx.loggedIn) return errorJson("Não autorizado.", 401);
  if (!ctx.site) return errorJson("Apenas ADMs do site.", 403);
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  const id = params.id;
  let data = {};
  try {
    data = await request.json();
  } catch {
    data = {};
  }
  if (data?.acao !== "pagar") return errorJson("Ação inválida.", 400);
  const row = await env.DB.prepare("SELECT * FROM reservations WHERE id = ?").bind(id).first();
  if (!row) return errorJson("Reserva não encontrada.", 404);
  const result = await markReservationPaid(env.DB, row, {
    paymentId: data.mp_payment_id || row.mp_payment_id || "manual",
  });
  if (!result.ok) return errorJson("Não foi possível confirmar o pagamento (nome já utilizado).", 409);
  return json({ ok: true, reserva: result.reservation, idempotent: Boolean(result.idempotent) });
}
