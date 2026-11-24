import { addMinutesIso, codeStatus, insertInviteCode } from "./convites.js";
import { createCustomPixPayment, fetchPayment } from "./mp.js";

export const CONTRIB_MAX_CENTS = 100000; // R$ 1.000,00
export const CONTRIB_HOLD_MS = 30 * 60 * 1000;

export function brl(cents) {
  return "R$ " + (Number(cents || 0) / 100).toFixed(2).replace(".", ",");
}

export async function listTiers(db, { includeDisabled = false } = {}) {
  const { results } = await db
    .prepare(
      `SELECT * FROM collective_box_tiers ${includeDisabled ? "" : "WHERE enabled = 1"} ORDER BY sort_order ASC`
    )
    .all();
  return results || [];
}

export async function getTier(db, tierId) {
  return db.prepare("SELECT * FROM collective_box_tiers WHERE id = ?").bind(String(tierId || "")).first();
}

async function latestBox(db, tierId) {
  return db
    .prepare("SELECT * FROM collective_boxes WHERE tier_id = ? ORDER BY opened_at DESC, round_n DESC LIMIT 1")
    .bind(tierId)
    .first();
}

export async function openBoxForTier(db, tierId) {
  const tier = await getTier(db, tierId);
  if (!tier) return { error: "not_found" };
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    // Transação: a caixa nasce com o saldo transferido (carryover) e o saldo da classe é debitado.
    await db.batch([
      db
        .prepare(
          `INSERT INTO collective_boxes
            (id, tier_id, round_n, goal_cents, raised_cents, code_duration_minutes, cooldown_minutes, status, opened_at)
           SELECT ?, t.id,
                  COALESCE((SELECT MAX(round_n) FROM collective_boxes WHERE tier_id = t.id), 0) + 1,
                  t.goal_cents, t.carryover_cents, t.code_duration_minutes, t.cooldown_minutes, 'open', ?
           FROM collective_box_tiers t WHERE t.id = ?`
        )
        .bind(id, now, tierId),
      db
        .prepare(
          `UPDATE collective_box_tiers
           SET carryover_cents = carryover_cents - (SELECT raised_cents FROM collective_boxes WHERE id = ?)
           WHERE id = ?`
        )
        .bind(id, tierId),
    ]);
  } catch (e) {
    if (/unique/i.test(String((e && e.message) || e))) return { error: "already_open" };
    throw e;
  }
  let box = await db.prepare("SELECT * FROM collective_boxes WHERE id = ?").bind(id).first();
  if (box && box.raised_cents >= box.goal_cents) {
    await fundBox(db, box.id);
    box = await db.prepare("SELECT * FROM collective_boxes WHERE id = ?").bind(id).first();
  }
  return { box };
}

/** Marca a caixa como completa, guarda a sobra na classe e gera o código coletivo. */
export async function fundBox(db, boxId) {
  const now = new Date().toISOString();
  const box = await db
    .prepare(
      `UPDATE collective_boxes SET status = 'funded', funded_at = ?
       WHERE id = ? AND status = 'open' AND raised_cents >= goal_cents RETURNING *`
    )
    .bind(now, boxId)
    .first();
  if (!box) return null;
  const surplus = Math.max(0, Number(box.raised_cents) - Number(box.goal_cents));
  const code = await insertInviteCode(db, {
    kind: "collective",
    boxId: box.id,
    tierId: box.tier_id,
    durationMinutes: Number(box.code_duration_minutes),
  });
  await db.batch([
    db
      .prepare("UPDATE collective_boxes SET code_id = ?, raised_cents = goal_cents WHERE id = ?")
      .bind(code.id, box.id),
    db
      .prepare("UPDATE collective_box_tiers SET carryover_cents = carryover_cents + ? WHERE id = ?")
      .bind(surplus, box.tier_id),
  ]);
  return { box: { ...box, raised_cents: box.goal_cents, code_id: code.id }, code, surplus };
}

/** Abre caixas preguiçosamente (sem cron): espera contada a partir da abertura da anterior da mesma classe. */
export async function syncCollectiveBoxes(db) {
  const now = new Date().toISOString();
  await db
    .prepare("UPDATE collective_contributions SET status = 'expired' WHERE status = 'pending' AND expires_at <= ?")
    .bind(now)
    .run();
  const tiers = await listTiers(db);
  for (const tier of tiers) {
    if (!Number(tier.enabled)) continue;
    const latest = await latestBox(db, tier.id);
    if (latest && latest.status === "open") continue;
    if (!Number(tier.auto_reopen)) continue;
    if (latest) {
      const nextOpen = addMinutesIso(latest.opened_at, Number(tier.cooldown_minutes));
      if (now < nextOpen) continue;
    }
    await openBoxForTier(db, tier.id);
  }
}

export async function tierView(db, tier, { admin = false } = {}) {
  const now = new Date().toISOString();
  const latest = await latestBox(db, tier.id);
  const open = latest && latest.status === "open" ? latest : null;
  const { results: codes } = await db
    .prepare(
      `SELECT c.*, b.round_n FROM invite_codes c LEFT JOIN collective_boxes b ON b.id = c.box_id
       WHERE c.kind = 'collective' AND c.tier_id = ? AND c.revoked_at IS NULL AND c.expires_at > ?
       ORDER BY c.expires_at DESC`
    )
    .bind(tier.id, now)
    .all();
  const ativos = (codes || [])
    .filter((c) => codeStatus(c, now) === "ativo")
    .map((c) => ({ id: c.id, code: c.code_upper, expires_at: c.expires_at, uses_count: Number(c.uses_count || 0), round_n: c.round_n == null ? null : Number(c.round_n) }));
  let nextOpenAt = null;
  let estado = "aberta";
  if (!Number(tier.enabled)) estado = "pausada";
  else if (!open) {
    if (latest) nextOpenAt = addMinutesIso(latest.opened_at, Number(tier.cooldown_minutes));
    if (!Number(tier.auto_reopen)) estado = "travada";
    else estado = "espera";
  }
  const { results: recent } = await db
    .prepare(
      `SELECT round_n, status, goal_cents, raised_cents, opened_at, funded_at FROM collective_boxes
       WHERE tier_id = ? AND status != 'open' ORDER BY opened_at DESC LIMIT 3`
    )
    .bind(tier.id)
    .all();
  const out = {
    id: tier.id,
    label: tier.label,
    goal_cents: Number(tier.goal_cents),
    code_duration_minutes: Number(tier.code_duration_minutes),
    cooldown_minutes: Number(tier.cooldown_minutes),
    min_contribution_cents: Number(tier.min_contribution_cents),
    enabled: Boolean(Number(tier.enabled)),
    auto_reopen: Boolean(Number(tier.auto_reopen)),
    estado,
    caixa: open
      ? {
          id: open.id,
          round_n: Number(open.round_n),
          goal_cents: Number(open.goal_cents),
          raised_cents: Number(open.raised_cents),
          opened_at: open.opened_at,
        }
      : null,
    ultima: latest
      ? { round_n: Number(latest.round_n), status: latest.status, opened_at: latest.opened_at, funded_at: latest.funded_at || null }
      : null,
    next_open_at: nextOpenAt,
    codigos_ativos: ativos,
    rodadas_recentes: (recent || []).map((r) => ({
      round_n: Number(r.round_n),
      status: r.status,
      goal_cents: Number(r.goal_cents),
      raised_cents: Number(r.raised_cents),
      opened_at: r.opened_at,
      funded_at: r.funded_at || null,
    })),
  };
  if (admin) out.carryover_cents = Number(tier.carryover_cents || 0);
  return out;
}

export async function tiersPayload(db, { admin = false } = {}) {
  await syncCollectiveBoxes(db);
  const tiers = await listTiers(db, { includeDisabled: admin });
  const out = [];
  for (const t of tiers) out.push(await tierView(db, t, { admin }));
  return out;
}

/** Confirma uma contribuição (idempotente): nunca conta duas vezes e nunca perde centavos. */
export async function confirmBoxContribution(db, contributionId, { paymentId = null, manualBy = null } = {}) {
  const now = new Date().toISOString();
  const pay = paymentId ? String(paymentId) : manualBy ? `manual:${manualBy}` : null;
  const contrib = await db
    .prepare(
      `UPDATE collective_contributions SET status = 'paid', paid_at = ?, mp_payment_id = COALESCE(mp_payment_id, ?)
       WHERE id = ? AND status != 'paid' RETURNING *`
    )
    .bind(now, pay, contributionId)
    .first();
  if (!contrib) {
    const row = await db.prepare("SELECT * FROM collective_contributions WHERE id = ?").bind(contributionId).first();
    if (!row) return { ok: false, reason: "not_found" };
    return { ok: true, idempotent: true, contribution: row };
  }
  const amount = Number(contrib.amount_cents);
  let box = await db
    .prepare("UPDATE collective_boxes SET raised_cents = raised_cents + ? WHERE id = ? AND status = 'open' RETURNING *")
    .bind(amount, contrib.box_id)
    .first();
  if (!box) {
    // A caixa original já fechou/completou antes do Pix cair: credita a caixa aberta da classe ou o saldo da classe.
    box = await db
      .prepare("UPDATE collective_boxes SET raised_cents = raised_cents + ? WHERE tier_id = ? AND status = 'open' RETURNING *")
      .bind(amount, contrib.tier_id)
      .first();
    if (!box) {
      await db
        .prepare("UPDATE collective_box_tiers SET carryover_cents = carryover_cents + ? WHERE id = ?")
        .bind(amount, contrib.tier_id)
        .run();
    }
  }
  let funded = null;
  if (box && Number(box.raised_cents) >= Number(box.goal_cents)) {
    funded = await fundBox(db, box.id);
  }
  return { ok: true, contribution: { ...contrib }, box, funded };
}

export async function refreshContribution(env, row) {
  if (!row || row.status === "paid" || !row.mp_payment_id || String(row.mp_payment_id).startsWith("manual")) return { row };
  let payment;
  try {
    payment = await fetchPayment(env, row.mp_payment_id);
  } catch {
    return { row };
  }
  const st = String(payment.status || "").toLowerCase();
  const ref = String(payment.external_reference || "");
  const amountOk = Number(payment.transaction_amount) + 0.001 >= Number(row.amount_cents) / 100;
  if (st === "approved" && amountOk && (ref === `caixa:${row.id}` || !ref)) {
    const result = await confirmBoxContribution(env.DB, row.id, { paymentId: payment.id });
    const updated = await env.DB.prepare("SELECT * FROM collective_contributions WHERE id = ?").bind(row.id).first();
    return { row: updated || row, result };
  }
  if ((st === "cancelled" || st === "rejected") && row.status === "pending") {
    await env.DB.prepare("UPDATE collective_contributions SET status = 'failed' WHERE id = ? AND status = 'pending'").bind(row.id).run();
    const updated = await env.DB.prepare("SELECT * FROM collective_contributions WHERE id = ?").bind(row.id).first();
    return { row: updated || row };
  }
  return { row };
}

export async function createContribution(env, { tierId, amountCents, email, ipHash }) {
  const db = env.DB;
  const tier = await getTier(db, tierId);
  if (!tier || !Number(tier.enabled)) return { error: "Esta caixa não está disponível.", status: 404 };
  await syncCollectiveBoxes(db);
  const box = await db
    .prepare("SELECT * FROM collective_boxes WHERE tier_id = ? AND status = 'open' LIMIT 1")
    .bind(tier.id)
    .first();
  if (!box) return { error: "Esta caixa não está aberta para contribuições agora.", status: 409 };
  const id = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CONTRIB_HOLD_MS).toISOString();
  await db
    .prepare(
      `INSERT INTO collective_contributions (id, box_id, tier_id, amount_cents, email, status, ip_hash, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`
    )
    .bind(id, box.id, tier.id, amountCents, email, ipHash, now.toISOString(), expiresAt)
    .run();
  let pix;
  try {
    pix = await createCustomPixPayment(env, {
      amountCents,
      description: `Basedisso · Caixa coletiva ${brl(tier.goal_cents).replace(",00", "")}`,
      externalReference: `caixa:${id}`,
      email,
      expiresAt,
      idempotencyKey: `caixa-${id}`,
    });
  } catch (e) {
    await db.prepare("UPDATE collective_contributions SET status = 'failed' WHERE id = ?").bind(id).run();
    return { error: "Não foi possível gerar o Pix. Tente de novo em instantes.", status: 502, detalhe: e && e.public ? e.public : null };
  }
  const exp = pix.date_of_expiration || expiresAt;
  await db
    .prepare("UPDATE collective_contributions SET mp_payment_id = ?, qr_code = ?, qr_code_base64 = ?, expires_at = ? WHERE id = ?")
    .bind(pix.id || null, pix.qr_code, pix.qr_code_base64, new Date(exp).toISOString(), id)
    .run();
  return {
    ok: true,
    contribuicao: { id, tier_id: tier.id, box_id: box.id, amount_cents: amountCents, status: "pending", expires_at: new Date(exp).toISOString() },
    pix: { qr_code: pix.qr_code, qr_code_base64: pix.qr_code_base64, expires_at: new Date(exp).toISOString() },
  };
}

export async function recentContributions(db, limit = 60) {
  const { results } = await db
    .prepare(
      `SELECT c.id, c.tier_id, c.box_id, c.amount_cents, c.email, c.status, c.mp_payment_id, c.created_at, c.paid_at, c.expires_at, b.round_n
       FROM collective_contributions c LEFT JOIN collective_boxes b ON b.id = c.box_id
       ORDER BY c.created_at DESC LIMIT ?`
    )
    .bind(limit)
    .all();
  return (results || []).map((r) => ({
    ...r,
    amount_cents: Number(r.amount_cents),
    round_n: r.round_n == null ? null : Number(r.round_n),
    manual: Boolean(r.mp_payment_id && String(r.mp_payment_id).startsWith("manual")),
  }));
}
