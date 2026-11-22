import {
  CLAIMABLE_ADMIN,
  PASSWORD_MAX,
  PASSWORD_MIN,
  createSession,
  hashPassword,
  isClaimableAdminName,
  isReservedUsername,
  normalizeEmail,
  normalizeUsername,
  randomToken,
  userCookieHeader,
} from "./auth.js";
import { hashIp, sha256Hex } from "./shared.js";
import { PRICE_BRL, createPreference, createPixPayment, fetchPayment, paymentAmountOk, reservasAbertas } from "./mp.js";

export const HOLD_MS = 30 * 60 * 1000; // Pix requires a minimum 30-minute expiration
export const RESERVA_COOKIE = "bd_reserva";
export const RESERVA_COOKIE_TTL = 60 * 60 * 24 * 30;

export async function expireHolds(db, nowIso) {
  const now = nowIso || new Date().toISOString();
  await db
    .prepare("UPDATE reservations SET status = 'expired' WHERE status = 'pending' AND expires_at <= ?")
    .bind(now)
    .run();
}

export async function nameConflict(db, usernameLc) {
  await expireHolds(db);
  const user = await db.prepare("SELECT id FROM users WHERE username_lc = ?").bind(usernameLc).first();
  if (user) return "em_uso";
  const row = await db
    .prepare(
      "SELECT id, status FROM reservations WHERE username_lc = ? AND status IN ('pending', 'paid', 'claimed') LIMIT 1"
    )
    .bind(usernameLc)
    .first();
  if (!row) return null;
  return row.status === "pending" ? "reservado" : "em_uso";
}

export function disponibilidadeErro(parsed, conflict) {
  if (!parsed) return "O nome deve ter 3 a 20 caracteres (letras, números ou _).";
  if (isClaimableAdminName(parsed.username_lc) || isReservedUsername(parsed.username_lc)) {
    return "Este nome não está disponível.";
  }
  if (conflict === "reservado") return "Este nome está temporariamente reservado. Tente outro ou aguarde.";
  if (conflict === "em_uso") return "Este nome já está em uso.";
  return null;
}

export function reservaCookieHeader(request, value, clear = false) {
  const url = new URL(request.url);
  const secure = url.protocol === "https:" ? "; Secure" : "";
  if (clear) {
    return `${RESERVA_COOKIE}=; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=0`;
  }
  return `${RESERVA_COOKIE}=${value}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=${RESERVA_COOKIE_TTL}`;
}

export function parseReservaCookie(request) {
  const raw = (request.headers.get("Cookie") || "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${RESERVA_COOKIE}=`));
  if (!raw) return null;
  const value = raw.slice(RESERVA_COOKIE.length + 1);
  const dot = value.indexOf(".");
  if (dot < 1) return null;
  return { id: value.slice(0, dot), token: value.slice(dot + 1) };
}

export async function nextPrimordialN(db) {
  await db
    .prepare("INSERT OR IGNORE INTO counters (name, value) VALUES ('primordial', 0)")
    .run();
  const row = await db
    .prepare("UPDATE counters SET value = value + 1 WHERE name = 'primordial' RETURNING value")
    .first();
  if (row && row.value != null) return Number(row.value);
  // Fallback if RETURNING is unavailable
  const cur = await db.prepare("SELECT value FROM counters WHERE name = 'primordial'").first();
  const n = Number(cur?.value || 0) + 1;
  await db.prepare("UPDATE counters SET value = ? WHERE name = 'primordial'").bind(n).run();
  return n;
}

export async function markReservationPaid(db, reservation, { paymentId } = {}) {
  if (!reservation) return { ok: false, reason: "not_found" };
  if (reservation.status === "claimed" || reservation.status === "paid") {
    if (paymentId && reservation.mp_payment_id && reservation.mp_payment_id !== String(paymentId)) {
      return { ok: true, idempotent: true, reservation, note: "already_paid_other" };
    }
    return { ok: true, idempotent: true, reservation };
  }
  await expireHolds(db);
  const taken = await db
    .prepare("SELECT id FROM users WHERE username_lc = ?")
    .bind(reservation.username_lc)
    .first();
  if (taken) return { ok: false, reason: "name_taken" };
  const other = await db
    .prepare(
      "SELECT id FROM reservations WHERE username_lc = ? AND status IN ('paid', 'claimed') AND id != ?"
    )
    .bind(reservation.username_lc, reservation.id)
    .first();
  if (other) return { ok: false, reason: "name_taken" };

  const n = reservation.primordial_n || (await nextPrimordialN(db));
  const paidAt = new Date().toISOString();
  await db
    .prepare(
      `UPDATE reservations
       SET status = 'paid', paid_at = ?, primordial_n = ?, mp_payment_id = COALESCE(?, mp_payment_id)
       WHERE id = ?`
    )
    .bind(paidAt, n, paymentId ? String(paymentId) : null, reservation.id)
    .run();
  const updated = await db.prepare("SELECT * FROM reservations WHERE id = ?").bind(reservation.id).first();
  return { ok: true, reservation: updated };
}

export function publicReserva(row, { claimUrl } = {}) {
  if (!row) return null;
  const out = {
    id: row.id,
    username: row.username,
    status: row.status,
    created_at: row.created_at,
    expires_at: row.expires_at,
    paid_at: row.paid_at || null,
    claimed_at: row.claimed_at || null,
    primordial_n: row.primordial_n == null ? null : Number(row.primordial_n),
    preco: PRICE_BRL,
  };
  if (claimUrl) out.claim_url = claimUrl;
  return out;
}

export function claimUrlFor(origin, id, token) {
  const u = new URL("/cadastro/retorno", origin);
  u.searchParams.set("rid", id);
  u.searchParams.set("t", token);
  return u.pathname + u.search;
}

export async function tokenMatches(row, rawToken) {
  if (!row || !row.claim_token_hash || !rawToken) return false;
  const hash = await sha256Hex(String(rawToken));
  return hash === row.claim_token_hash;
}

export async function refreshReservationPayment(env, row) {
  if (!row || row.status !== "pending" || !row.mp_payment_id || !env?.DB) return row;
  let payment;
  try {
    payment = await fetchPayment(env, row.mp_payment_id);
  } catch {
    return row;
  }
  const st = String(payment.status || "").toLowerCase();
  if (st === "approved" && paymentAmountOk(payment)) {
    const ref = String(payment.external_reference || "").trim();
    if (ref && ref !== row.id) return row;
    const result = await markReservationPaid(env.DB, row, { paymentId: payment.id });
    return result.reservation || row;
  }
  if (st === "cancelled" || st === "rejected" || st === "expired") {
    await env.DB.prepare("UPDATE reservations SET status = 'expired' WHERE id = ? AND status = 'pending'")
      .bind(row.id)
      .run();
    const updated = await env.DB.prepare("SELECT * FROM reservations WHERE id = ?").bind(row.id).first();
    return updated || row;
  }
  return row;
}

export async function createReservation(env, request, { username, email, method }) {
  if (!env.DB) return { error: "Serviço de reservas indisponível.", status: 503 };
  if (!reservasAbertas(env)) {
    return { error: "Reservas abrem em breve.", status: 503, code: "em_breve" };
  }
  const parsed = normalizeUsername(username);
  const conflict = parsed ? await nameConflict(env.DB, parsed.username_lc) : null;
  const err = disponibilidadeErro(parsed, conflict);
  if (err) return { error: err, status: conflict === "em_uso" || conflict === "reservado" ? 409 : 400 };

  const emailNorm = normalizeEmail(email);
  if (!emailNorm) return { error: "Informe um e-mail válido.", status: 400 };

  const metodoRaw = String(method || "pix").toLowerCase();
  const isCard = metodoRaw === "card" || metodoRaw === "cartao" || metodoRaw === "checkout";
  const metodo = isCard ? "card" : "pix";

  const id = crypto.randomUUID();
  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const now = new Date();
  const expires = new Date(now.getTime() + HOLD_MS);
  const ipHash = await hashIp(request, env);

  try {
    await env.DB.prepare(
      `INSERT INTO reservations
        (id, username, username_lc, email, status, created_at, expires_at, claim_token_hash, ip_hash, amount_centavos, currency)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, 'BRL')`
    )
      .bind(
        id,
        parsed.username,
        parsed.username_lc,
        emailNorm,
        now.toISOString(),
        expires.toISOString(),
        tokenHash,
        ipHash,
        Math.round(PRICE_BRL * 100)
      )
      .run();
  } catch (e) {
    const msg = String((e && e.message) || e);
    if (/unique/i.test(msg)) return { error: "Este nome já está em uso.", status: 409 };
    throw e;
  }

  const origin = new URL(request.url).origin;
  const expiresAt = expires.toISOString();
  const reservaPublica = publicReserva({
    id,
    username: parsed.username,
    status: "pending",
    created_at: now.toISOString(),
    expires_at: expiresAt,
    primordial_n: null,
  });

  if (isCard) {
    let pref;
    try {
      pref = await createPreference(env, {
        reservationId: id,
        username: parsed.username,
        email: emailNorm,
        origin,
        expiresAt,
      });
    } catch (e) {
      await env.DB.prepare("UPDATE reservations SET status = 'expired' WHERE id = ?").bind(id).run();
      return { error: "Não foi possível iniciar o pagamento. Tente de novo em instantes.", status: 502 };
    }
    await env.DB.prepare("UPDATE reservations SET mp_preference_id = ? WHERE id = ?")
      .bind(pref.id || null, id)
      .run();
    return {
      ok: true,
      metodo: "card",
      reserva: reservaPublica,
      checkout_url: pref.init_point || pref.sandbox_init_point,
      cookie: `${id}.${token}`,
    };
  }

  let pix;
  try {
    pix = await createPixPayment(env, {
      reservationId: id,
      username: parsed.username,
      email: emailNorm,
      expiresAt,
    });
  } catch (e) {
    await env.DB.prepare("UPDATE reservations SET status = 'expired' WHERE id = ?").bind(id).run();
    return {
      error: "Não foi possível gerar o Pix. Tente de novo em instantes.",
      status: 502,
      detalhe: e && e.public ? e.public : null,
    };
  }
  await env.DB.prepare("UPDATE reservations SET mp_payment_id = ? WHERE id = ?")
    .bind(pix.id || null, id)
    .run();
  return {
    ok: true,
    metodo: "pix",
    reserva: reservaPublica,
    pix: {
      qr_code: pix.qr_code,
      qr_code_base64: pix.qr_code_base64,
      expires_at: pix.date_of_expiration || expiresAt,
    },
    cookie: `${id}.${token}`,
  };
}

export async function claimReservation(env, request, { password, token, reservationId }) {
  if (!env.DB) return { error: "Serviço de contas indisponível.", status: 503 };
  const pw = String(password ?? "");
  if (pw.length < PASSWORD_MIN) {
    return { error: `A senha deve ter pelo menos ${PASSWORD_MIN} caracteres.`, status: 400 };
  }
  if (pw.length > PASSWORD_MAX) return { error: "Senha longa demais.", status: 400 };

  await expireHolds(env.DB);
  let row = null;
  const cookie = parseReservaCookie(request);
  const rawToken = token || (cookie && cookie.token);
  const rid = reservationId || (cookie && cookie.id);
  if (rid) {
    row = await env.DB.prepare("SELECT * FROM reservations WHERE id = ?").bind(rid).first();
  }
  if (!row && rawToken) {
    const hash = await sha256Hex(rawToken);
    row = await env.DB.prepare("SELECT * FROM reservations WHERE claim_token_hash = ?").bind(hash).first();
  }
  if (!row) return { error: "Reserva não encontrada.", status: 404 };
  if (!(await tokenMatches(row, rawToken))) {
    return { error: "Link de reivindicação inválido ou expirado.", status: 403 };
  }
  if (row.status === "claimed") {
    return { error: "Este nome já foi reivindicado. Entre com a sua senha.", status: 409 };
  }
  if (row.status !== "paid") {
    return { error: "O pagamento ainda não foi confirmado.", status: 409 };
  }

  const existing = await env.DB.prepare("SELECT id FROM users WHERE username_lc = ?")
    .bind(row.username_lc)
    .first();
  if (existing) return { error: "Este nome já está em uso.", status: 409 };

  const userId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const passwordHash = await hashPassword(pw);
  const n = row.primordial_n || (await nextPrimordialN(env.DB));
  try {
    await env.DB.prepare(
      `INSERT INTO users (id, username, username_lc, password_hash, email, is_admin, is_primordial, primordial_n, created_at)
       VALUES (?, ?, ?, ?, ?, 0, 1, ?, ?)`
    )
      .bind(userId, row.username, row.username_lc, passwordHash, row.email || null, n, createdAt)
      .run();
  } catch (e) {
    const msg = String((e && e.message) || e);
    if (/unique/i.test(msg)) return { error: "Este nome já está em uso.", status: 409 };
    throw e;
  }
  await env.DB.prepare(
    `UPDATE reservations SET status = 'claimed', claimed_at = ?, user_id = ?, primordial_n = ? WHERE id = ?`
  )
    .bind(createdAt, userId, n, row.id)
    .run();

  const sess = await createSession(env.DB, userId);
  return {
    ok: true,
    usuario: {
      username: row.username,
      is_admin: false,
      is_primordial: true,
      primordial_n: n,
      created_at: createdAt,
    },
    sessionToken: sess,
  };
}

export { normalizeUsername, normalizeEmail, isReservedUsername, isClaimableAdminName, CLAIMABLE_ADMIN, reservasAbertas, PRICE_BRL };
