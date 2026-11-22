import { errorJson, json, sha256Hex } from "../../_lib/shared.js";
import {
  claimUrlFor,
  expireHolds,
  parseReservaCookie,
  publicReserva,
  tokenMatches,
} from "../../_lib/reservas.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB) return errorJson("Serviço de reservas indisponível.", 503);
  await expireHolds(env.DB);

  const url = new URL(request.url);
  const qid = url.searchParams.get("rid") || url.searchParams.get("id") || "";
  const qpref = url.searchParams.get("preference_id") || "";
  const qtoken = url.searchParams.get("t") || "";
  const cookie = parseReservaCookie(request);

  let row = null;
  if (qid) row = await env.DB.prepare("SELECT * FROM reservations WHERE id = ?").bind(qid).first();
  if (!row && qpref) {
    row = await env.DB.prepare("SELECT * FROM reservations WHERE mp_preference_id = ?").bind(qpref).first();
  }
  if (!row && cookie?.id) {
    row = await env.DB.prepare("SELECT * FROM reservations WHERE id = ?").bind(cookie.id).first();
  }
  if (!row && (qtoken || cookie?.token)) {
    const hash = await sha256Hex(qtoken || cookie.token);
    row = await env.DB.prepare("SELECT * FROM reservations WHERE claim_token_hash = ?").bind(hash).first();
  }
  if (!row) return errorJson("Reserva não encontrada.", 404);

  const rawToken = qtoken || (cookie && cookie.id === row.id ? cookie.token : "") || (cookie && cookie.token) || "";
  const owns = await tokenMatches(row, rawToken);
  if (!owns) {
    return json({ ok: true, reserva: publicReserva(row), sua: false });
  }

  const origin = url.origin;
  const claimUrl = claimUrlFor(origin, row.id, rawToken);
  return json({
    ok: true,
    sua: true,
    reserva: publicReserva(row, { claimUrl: row.status === "paid" ? claimUrl : null }),
  });
}
