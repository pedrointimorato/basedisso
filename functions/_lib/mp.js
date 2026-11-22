import { hmacHex, safeEqual } from "./shared.js";

export const PRICE_BRL = 5;
export const CURRENCY = "BRL";
export const ITEM_TITLE_PREFIX = "Nome primordial >>";

export function isMockMp(env) {
  const token = String(env?.MP_ACCESS_TOKEN || "");
  return env?.MP_MOCK === "1" || token === "mock" || token.startsWith("TEST_MOCK");
}

export function isValidMpAccessToken(token) {
  const t = String(token ?? "").trim();
  return (t.startsWith("APP_USR-") || t.startsWith("TEST-")) && t.length > 30;
}

export function reservasAbertas(env) {
  return isValidMpAccessToken(env?.MP_ACCESS_TOKEN);
}

export async function createPreference(env, { reservationId, username, email, origin, expiresAt }) {
  const title = `${ITEM_TITLE_PREFIX}${username}`;
  const back = `${origin}/cadastro/retorno?rid=${encodeURIComponent(reservationId)}`;
  const notificationUrl = "https://basedisso.com/api/mp/webhook";
  const body = {
    items: [
      {
        title,
        quantity: 1,
        unit_price: PRICE_BRL,
        currency_id: CURRENCY,
      },
    ],
    external_reference: reservationId,
    back_urls: { success: back, pending: back, failure: back },
    auto_return: "approved",
    notification_url: notificationUrl,
    statement_descriptor: "BASEDISSO",
    expires: true,
    expiration_date_to: expiresAt,
  };
  if (email) body.payer = { email };

  if (isMockMp(env)) {
    return {
      id: `mock-pref-${reservationId}`,
      init_point: `${origin}/cadastro/retorno?rid=${encodeURIComponent(reservationId)}&mock=1`,
      sandbox_init_point: `${origin}/cadastro/retorno?rid=${encodeURIComponent(reservationId)}&mock=1`,
    };
  }

  const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.init_point) {
    const err = new Error("mp_preference_failed");
    err.detail = data;
    throw err;
  }
  return data;
}

export async function fetchPayment(env, paymentId) {
  const id = String(paymentId || "").trim();
  if (!id) throw new Error("missing_payment_id");

  if (isMockMp(env)) {
    return mockPayment(id);
  }

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error("mp_payment_fetch");
    err.status = res.status;
    err.detail = data;
    throw err;
  }
  return data;
}

/** Test helpers: ok:{reservationId}, badamt:{reservationId}, pending:{reservationId} */
export function mockPayment(paymentId) {
  const id = String(paymentId || "");
  let kind = "ok";
  let reservationId = id;
  const m = id.match(/^(ok|badamt|pending):(.+)$/);
  if (m) {
    kind = m[1];
    reservationId = m[2];
  }
  const amount = kind === "badamt" ? 10 : PRICE_BRL;
  const status = kind === "pending" ? "pending" : "approved";
  return {
    id,
    status,
    transaction_amount: amount,
    currency_id: CURRENCY,
    external_reference: reservationId,
    live_mode: false,
  };
}

export function paymentAmountOk(payment) {
  if (!payment) return false;
  if (String(payment.currency_id || "").toUpperCase() !== CURRENCY) return false;
  const cents = Math.round(Number(payment.transaction_amount) * 100);
  return cents === Math.round(PRICE_BRL * 100);
}

export function extractPaymentId(url, body) {
  const q = url.searchParams;
  const qData = q.get("data.id");
  if (qData) return String(qData).trim();
  const topic = (q.get("type") || q.get("topic") || "").toLowerCase();
  if ((topic === "payment" || !topic) && q.get("id") && topic === "payment") {
    return String(q.get("id")).trim();
  }
  if (body && body.data && body.data.id != null) return String(body.data.id).trim();
  if (body && (body.type === "payment" || body.topic === "payment") && body.id) {
    return String(body.id).trim();
  }
  if (topic === "payment" && q.get("id")) return String(q.get("id")).trim();
  return "";
}

export function isPaymentNotification(url, body) {
  const q = url.searchParams;
  const topic = (q.get("type") || q.get("topic") || body?.type || body?.topic || "").toLowerCase();
  if (topic === "payment" || topic === "payment.created" || topic === "payment.updated") return true;
  if (body?.action && String(body.action).startsWith("payment.")) return true;
  if (q.get("data.id") || (body && body.data && body.data.id)) {
    return !topic || topic.startsWith("payment");
  }
  return false;
}

/**
 * Validate x-signature when MP_WEBHOOK_SECRET is set.
 * Manifest: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 * data.id is lowercased, following the official Mercado Pago SDK.
 */
export async function verifyMpSignature(request, env, dataId) {
  const secret = String(env?.MP_WEBHOOK_SECRET ?? "").trim();
  if (!secret) return { ok: false, reason: "missing_secret" };
  const xsig = request.headers.get("x-signature") || "";
  const reqId = (request.headers.get("x-request-id") || "").trim();
  const parts = {};
  for (const part of xsig.split(",")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    parts[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim();
  }
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return { ok: false, reason: "missing_signature" };
  const id = String(dataId || "").trim().toLowerCase();
  let manifest = "";
  if (id) manifest += `id:${id};`;
  if (reqId) manifest += `request-id:${reqId};`;
  manifest += `ts:${ts};`;
  const expected = await hmacHex(secret, manifest);
  if (!safeEqual(expected, String(v1).toLowerCase())) {
    return { ok: false, reason: "mismatch", manifest };
  }
  return { ok: true, manifest };
}
