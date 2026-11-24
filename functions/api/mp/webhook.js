import { json } from "../../_lib/shared.js";
import {
  extractPaymentId,
  fetchPayment,
  isPaymentNotification,
  paymentAmountOk,
  verifyMpSignature,
} from "../../_lib/mp.js";
import { expireHolds, markReservationPaid } from "../../_lib/reservas.js";
import { confirmBoxContribution } from "../../_lib/caixas.js";

export async function onRequestGet() {
  return json({ ok: true });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!String(env?.MP_WEBHOOK_SECRET ?? "").trim()) {
    return json({ ok: false, erro: "assinatura inválida" }, 401);
  }
  let body = null;
  const ct = request.headers.get("Content-Type") || "";
  try {
    if (ct.includes("application/json")) body = await request.json();
    else if (ct.includes("application/x-www-form-urlencoded")) {
      const text = await request.text();
      body = Object.fromEntries(new URLSearchParams(text));
    }
  } catch {
    body = null;
  }

  const url = new URL(request.url);
  if (!isPaymentNotification(url, body) && !extractPaymentId(url, body)) {
    return json({ ok: true, ignored: true }, 200);
  }

  const paymentId = extractPaymentId(url, body);
  const sig = await verifyMpSignature(request, env, paymentId);
  if (!sig.ok) return json({ ok: false, erro: "assinatura inválida" }, 401);
  if (!paymentId) return json({ ok: true, ignored: true }, 200);
  if (!env.DB) return json({ ok: false, erro: "db" }, 503);

  let payment;
  try {
    payment = await fetchPayment(env, paymentId);
  } catch {
    return json({ ok: false, erro: "falha ao consultar pagamento" }, 502);
  }

  if (String(payment.status || "").toLowerCase() !== "approved") {
    return json({ ok: true, ignored: true, status: payment.status || null }, 200);
  }
  const ref = String(payment.external_reference || "").trim();
  if (!ref) return json({ ok: true, ignored: true, reason: "no_reference" }, 200);

  // Contribuições das caixas de acesso coletivo (valor livre, mínimo R$ 1).
  if (ref.startsWith("caixa:")) {
    const contribution = await env.DB.prepare("SELECT * FROM collective_contributions WHERE id = ?")
      .bind(ref.slice(6))
      .first();
    if (!contribution) return json({ ok: true, ignored: true, reason: "unknown_reference" }, 200);
    if (String(payment.currency_id || "BRL").toUpperCase() !== "BRL" ||
        !(Number(payment.transaction_amount) + 0.001 >= Number(contribution.amount_cents) / 100)) {
      return json({ ok: true, ignored: true, reason: "amount" }, 200);
    }
    const out = await confirmBoxContribution(env.DB, contribution.id, { paymentId });
    return json({ ok: true, caixa: true, idempotent: Boolean(out.idempotent) }, 200);
  }

  if (!paymentAmountOk(payment)) {
    return json({ ok: true, ignored: true, reason: "amount" }, 200);
  }

  await expireHolds(env.DB);
  const row = await env.DB.prepare("SELECT * FROM reservations WHERE id = ?").bind(ref).first();
  if (!row) return json({ ok: true, ignored: true, reason: "unknown_reference" }, 200);

  const result = await markReservationPaid(env.DB, row, { paymentId });
  if (!result.ok && result.reason === "name_taken") {
    return json({ ok: true, ignored: true, reason: "name_taken" }, 200);
  }
  return json({ ok: true, idempotent: Boolean(result.idempotent) }, 200);
}
