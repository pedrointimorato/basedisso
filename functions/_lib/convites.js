import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  createSession,
  hashPassword,
  normalizeEmail,
  normalizeUsername,
} from "./auth.js";
import { clientIp, countRate, hashIp, recordRate, sha256Hex } from "./shared.js";
import { disponibilidadeErro, nameConflict, nextPrimordialN } from "./reservas.js";

export const CODE_RE = /^[A-Za-z0-9]{6}$/;
export const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
export const PRIMORDIAL_CODE_MINUTES = 24 * 60; // código de primordial pagante: 24h
export const PRIMORDIAL_COOLDOWN_MINUTES = 72 * 60; // um a cada 72h
export const ADM_MAX_MINUTES = 365 * 24 * 60;
export const MSG_SO_PAGANTES =
  "Apenas usuários primordiais que pagaram a inscrição individual podem gerar códigos de convite.";

const RATE_CODE_CHECK_10MIN = 40;
const RATE_CODE_FAIL_15MIN = 15;
const RATE_SIGNUP_CODE_HOUR = 10;

/**
 * Hash anônimo da "rede" para a trava de 1 cadastro por código: IPv4 completo ou o prefixo /64 do IPv6
 * (um mesmo acesso IPv6 costuma ter um /64 inteiro e pode trocar de endereço à vontade dentro dele).
 */
export function networkOf(ip) {
  const s = String(ip || "").trim().toLowerCase();
  if (!s.includes(":")) return s;
  const [head, tail = ""] = s.split("::");
  const h = head ? head.split(":") : [];
  const t = tail ? tail.split(":") : [];
  const full = s.includes("::") ? [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill("0"), ...t] : h;
  return full.slice(0, 4).map((x) => x.replace(/^0+(?=.)/, "") || "0").join(":") + "::/64";
}

export async function networkHash(request, env) {
  const salt = env.IP_HASH_SALT || env.ADMIN_TOKEN || "local-dev-salt";
  return sha256Hex(`${salt}|net|${networkOf(clientIp(request))}`);
}

export function normalizeCode(raw) {
  const s = String(raw ?? "").trim();
  if (!CODE_RE.test(s)) return null;
  return s.toUpperCase();
}

export function randomCode() {
  const out = [];
  const max = 252; // 36 * 7, rejeição para distribuição uniforme
  while (out.length < 6) {
    const buf = crypto.getRandomValues(new Uint8Array(12));
    for (let i = 0; i < buf.length && out.length < 6; i++) {
      if (buf[i] < max) out.push(CODE_ALPHABET[buf[i] % 36]);
    }
  }
  return out.join("");
}

export function addMinutesIso(iso, minutes) {
  return new Date(new Date(iso).getTime() + Number(minutes) * 60000).toISOString();
}

export async function activeCodeByUpper(db, upper, nowIso) {
  const now = nowIso || new Date().toISOString();
  return db
    .prepare(
      `SELECT * FROM invite_codes
       WHERE code_upper = ? AND revoked_at IS NULL AND expires_at > ?
       ORDER BY created_at DESC LIMIT 1`
    )
    .bind(upper, now)
    .first();
}

export function codeStatus(row, nowIso) {
  const now = nowIso || new Date().toISOString();
  if (!row) return "inexistente";
  if (row.revoked_at) return "revogado";
  if (row.expires_at <= now) return "expirado";
  if (row.max_uses != null && Number(row.uses_count) >= Number(row.max_uses)) return "esgotado";
  return "ativo";
}

/** Cria um código único entre os ativos. Retorna a linha inserida (ou {conflict:true}). */
export async function insertInviteCode(db, { code, kind, createdBy = null, boxId = null, tierId = null, durationMinutes, maxUses = null }) {
  const now = new Date().toISOString();
  const expires = addMinutesIso(now, durationMinutes);
  for (let attempt = 0; attempt < 8; attempt++) {
    const upper = code ? code.toUpperCase() : randomCode();
    const clash = await activeCodeByUpper(db, upper, now);
    if (clash) {
      if (code) return { conflict: true };
      continue;
    }
    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO invite_codes
          (id, code, code_upper, kind, created_by_user_id, box_id, tier_id, duration_minutes, max_uses, uses_count, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
      )
      .bind(id, upper, upper, kind, createdBy, boxId, tierId, durationMinutes, maxUses, now, expires)
      .run();
    return db.prepare("SELECT * FROM invite_codes WHERE id = ?").bind(id).first();
  }
  throw new Error("code_generation_failed");
}

export function publicCode(row, nowIso) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code_upper,
    kind: row.kind,
    tier_id: row.tier_id || null,
    box_id: row.box_id || null,
    duration_minutes: Number(row.duration_minutes),
    max_uses: row.max_uses == null ? null : Number(row.max_uses),
    uses_count: Number(row.uses_count || 0),
    created_at: row.created_at,
    expires_at: row.expires_at,
    revoked_at: row.revoked_at || null,
    status: codeStatus(row, nowIso),
  };
}

/** Regras do primordial pagante: próxima geração liberada em created_at + 72h. */
export async function primordialCodeState(db, user) {
  const now = new Date().toISOString();
  const { results } = await db
    .prepare(
      `SELECT * FROM invite_codes WHERE created_by_user_id = ? ORDER BY created_at DESC LIMIT 50`
    )
    .bind(user.id)
    .all();
  const rows = results || [];
  const lastPrim = rows.find((r) => r.kind === "primordial") || null;
  let proximo = null;
  if (lastPrim) {
    const next = addMinutesIso(lastPrim.created_at, PRIMORDIAL_COOLDOWN_MINUTES);
    if (next > now) proximo = next;
  }
  return { rows, lastPrim, proximo, now };
}

export async function generatePrimordialCode(db, user) {
  const now = new Date().toISOString();
  const since = addMinutesIso(now, -PRIMORDIAL_COOLDOWN_MINUTES);
  for (let attempt = 0; attempt < 8; attempt++) {
    const upper = randomCode();
    if (await activeCodeByUpper(db, upper, now)) continue;
    const id = crypto.randomUUID();
    const expires = addMinutesIso(now, PRIMORDIAL_CODE_MINUTES);
    // Inserção condicional = trava atômica de 72h (duas requisições simultâneas não geram dois códigos).
    const res = await db
      .prepare(
        `INSERT INTO invite_codes
          (id, code, code_upper, kind, created_by_user_id, duration_minutes, max_uses, uses_count, created_at, expires_at)
         SELECT ?, ?, ?, 'primordial', ?, ?, NULL, 0, ?, ?
         WHERE NOT EXISTS (
           SELECT 1 FROM invite_codes WHERE created_by_user_id = ? AND kind = 'primordial' AND created_at > ?
         )`
      )
      .bind(id, upper, upper, user.id, PRIMORDIAL_CODE_MINUTES, now, expires, user.id, since)
      .run();
    if (!res.meta || !res.meta.changes) return { cooldown: true };
    return { row: await db.prepare("SELECT * FROM invite_codes WHERE id = ?").bind(id).first() };
  }
  throw new Error("code_generation_failed");
}

export async function codeRateBlocked(db, ipHash) {
  const since15 = new Date(Date.now() - 15 * 60000).toISOString();
  const fails = await countRate(db, ipHash, "code_fail", since15);
  return fails >= RATE_CODE_FAIL_15MIN;
}

export async function validateCodePublic(env, request, raw) {
  const db = env.DB;
  const ipHash = await hashIp(request, env);
  const since10 = new Date(Date.now() - 10 * 60000).toISOString();
  const checks = await countRate(db, ipHash, "code_check", since10);
  if (checks >= RATE_CODE_CHECK_10MIN || (await codeRateBlocked(db, ipHash))) {
    return { status: 429, body: { valido: false, motivo: "Muitas tentativas. Espere alguns minutos." } };
  }
  await recordRate(db, ipHash, "code_check");
  const upper = normalizeCode(raw);
  if (!upper) {
    return { status: 400, body: { valido: false, motivo: "O código tem 6 caracteres: letras e/ou números." } };
  }
  const now = new Date().toISOString();
  const active = await activeCodeByUpper(db, upper, now);
  let row = active;
  if (!row) {
    row = await db
      .prepare("SELECT * FROM invite_codes WHERE code_upper = ? ORDER BY created_at DESC LIMIT 1")
      .bind(upper)
      .first();
  }
  const st = codeStatus(row, now);
  if (st !== "ativo") {
    await recordRate(db, ipHash, "code_fail");
    const motivo = {
      inexistente: "Código não encontrado.",
      revogado: "Este código foi cancelado pelos ADMs.",
      expirado: "Este código expirou.",
      esgotado: "Este código já atingiu o limite de usos.",
    }[st];
    return { status: 200, body: { valido: false, motivo, status: st } };
  }
  const netHash = await networkHash(request, env);
  const used = await db
    .prepare("SELECT 1 AS ok FROM invite_redemptions WHERE code_id = ? AND ip_hash = ?")
    .bind(row.id, netHash)
    .first();
  if (used) {
    return { status: 200, body: { valido: false, motivo: "Este código já foi usado nesta rede.", status: "usado_rede" } };
  }
  return {
    status: 200,
    body: { valido: true, motivo: null, expires_at: row.expires_at, kind: row.kind, tier_id: row.tier_id || null },
  };
}

function err(error, status) {
  return { error, status };
}

/** Cadastro de primordial (não pagante) por código de convite/acesso. */
export async function signupWithCode(env, request, data) {
  const db = env.DB;
  const parsed = normalizeUsername(data?.username);
  const conflict = parsed ? await nameConflict(db, parsed.username_lc) : null;
  const nameErr = disponibilidadeErro(parsed, conflict);
  if (nameErr) return err(nameErr, conflict ? 409 : 400);

  const emailRaw = String(data?.email ?? "").trim();
  let email = null;
  if (emailRaw) {
    email = normalizeEmail(emailRaw);
    if (!email) return err("E-mail inválido.", 400);
  }
  const password = String(data?.password ?? "");
  if (password.length < PASSWORD_MIN) return err(`A senha deve ter pelo menos ${PASSWORD_MIN} caracteres.`, 400);
  if (password.length > PASSWORD_MAX) return err("Senha longa demais.", 400);

  const upper = normalizeCode(data?.code ?? data?.codigo);
  if (!upper) return err("O código tem 6 caracteres: letras e/ou números.", 400);

  const ipHash = await hashIp(request, env);
  if (await codeRateBlocked(db, ipHash)) return err("Muitas tentativas com códigos inválidos. Espere alguns minutos.", 429);
  const hourAgo = new Date(Date.now() - 3600000).toISOString();
  if ((await countRate(db, ipHash, "signup_code", hourAgo)) >= RATE_SIGNUP_CODE_HOUR) {
    return err("Muitas contas criadas deste endereço. Tente mais tarde.", 429);
  }

  const now = new Date().toISOString();
  let code = await activeCodeByUpper(db, upper, now);
  if (!code) {
    code = await db
      .prepare("SELECT * FROM invite_codes WHERE code_upper = ? ORDER BY created_at DESC LIMIT 1")
      .bind(upper)
      .first();
  }
  const st = codeStatus(code, now);
  if (st !== "ativo") {
    await recordRate(db, ipHash, "code_fail");
    const msg = {
      inexistente: "Código não encontrado.",
      revogado: "Este código foi cancelado pelos ADMs.",
      expirado: "Este código expirou.",
      esgotado: "Este código já atingiu o limite de usos.",
    }[st] || "Código inválido.";
    return err(msg, st === "inexistente" ? 404 : 410);
  }
  const netHash = await networkHash(request, env);
  const used = await db
    .prepare("SELECT 1 AS ok FROM invite_redemptions WHERE code_id = ? AND ip_hash = ?")
    .bind(code.id, netHash)
    .first();
  if (used) return err("Este código já foi usado nesta rede.", 429);

  // Consome um uso de forma condicional (respeita validade, revogação e limite).
  const consume = await db
    .prepare(
      `UPDATE invite_codes SET uses_count = uses_count + 1
       WHERE id = ? AND revoked_at IS NULL AND expires_at > ? AND (max_uses IS NULL OR uses_count < max_uses)`
    )
    .bind(code.id, now)
    .run();
  if (!consume.meta || !consume.meta.changes) return err("Este código não está mais disponível.", 410);
  const release = () =>
    db.prepare("UPDATE invite_codes SET uses_count = MAX(uses_count - 1, 0) WHERE id = ?").bind(code.id).run();

  const userId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const passwordHash = await hashPassword(password);
  let n = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    n = await nextPrimordialN(db);
    try {
      await db
        .prepare(
          `INSERT INTO users (id, username, username_lc, password_hash, email, is_admin, is_primordial, primordial_n, created_at, is_paid_primordial, invited_by_code_id)
           VALUES (?, ?, ?, ?, ?, 0, 1, ?, ?, 0, ?)`
        )
        .bind(userId, parsed.username, parsed.username_lc, passwordHash, email, n, createdAt, code.id)
        .run();
      break;
    } catch (e) {
      const msg = String((e && e.message) || e);
      if (/primordial_n/i.test(msg) && attempt < 4) continue; // #N disputado: tenta o próximo
      await release();
      if (/unique/i.test(msg)) return err("Este nome já está em uso.", 409);
      throw e;
    }
  }

  try {
    await db
      .prepare("INSERT INTO invite_redemptions (id, code_id, user_id, ip_hash, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), code.id, userId, netHash, createdAt)
      .run();
  } catch (e) {
    await db.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();
    await release();
    if (/unique/i.test(String((e && e.message) || e))) return err("Este código já foi usado nesta rede.", 429);
    throw e;
  }
  await recordRate(db, ipHash, "signup_code");
  const token = await createSession(db, userId);
  return {
    ok: true,
    sessionToken: token,
    usuario: {
      username: parsed.username,
      is_admin: false,
      is_primordial: true,
      is_paid_primordial: false,
      primordial_n: n,
      created_at: createdAt,
    },
  };
}

/** Lista para auditoria dos ADMs do site. */
export async function listCodesForAdmin(db, limit = 200) {
  const now = new Date().toISOString();
  const { results } = await db
    .prepare(
      `SELECT c.*, u.username AS creator
       FROM invite_codes c LEFT JOIN users u ON u.id = c.created_by_user_id
       ORDER BY c.created_at DESC LIMIT ?`
    )
    .bind(limit)
    .all();
  const codes = results || [];
  const { results: reds } = await db
    .prepare(
      `SELECT r.code_id, r.ip_hash, r.created_at, u.username, u.primordial_n,
              (SELECT COUNT(*) FROM invite_redemptions r2 WHERE r2.ip_hash = r.ip_hash) AS shared_ip_count,
              (SELECT COUNT(DISTINCT r3.code_id) FROM invite_redemptions r3 WHERE r3.ip_hash = r.ip_hash) AS shared_ip_codes
       FROM invite_redemptions r LEFT JOIN users u ON u.id = r.user_id
       ORDER BY r.created_at ASC`
    )
    .all();
  const by = {};
  for (const r of reds || []) {
    (by[r.code_id] = by[r.code_id] || []).push({
      username: r.username || "(conta apagada)",
      primordial_n: r.primordial_n == null ? null : Number(r.primordial_n),
      created_at: r.created_at,
      shared_ip_count: Number(r.shared_ip_count || 0),
      shared_ip_codes: Number(r.shared_ip_codes || 0),
    });
  }
  return codes.map((c) => ({
    ...publicCode(c, now),
    criador: c.creator || null,
    resgates: by[c.id] || [],
  }));
}
