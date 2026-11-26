import { ANON_RESERVED } from "./anonimo.js";
import { hashIp, isSameOrigin, parseCookies, sha256Hex } from "./shared.js";
import { USERNAME_RE } from "./mentions.js";

export const PBKDF2_ITERATIONS = 100000;
export const SESSION_COOKIE = "bd_sess";
export const SESSION_TTL_SEC = 60 * 60 * 24 * 30;
export const CLAIMABLE_ADMIN = "Intimorato";
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

const RESERVED = new Set(
  [
    "adm",
    "admin",
    "administrator",
    "administrador",
    "moderacao",
    "moderar",
    "moderator",
    "moderador",
    "moderation",
    "api",
    "s",
    "f",
    "entrar",
    "cadastro",
    "sair",
    "login",
    "logout",
    "signup",
    "register",
    "user",
    "users",
    "perfil",
    "profile",
    "settings",
    "conta",
    "account",
    "root",
    "system",
    "basedisso",
    "www",
    "static",
    "assets",
    "functions",
    "comentarios",
    "comentario",
    "comments",
    "about",
    "ajuda",
    "help",
    "staff",
    "suporte",
    "support",
    "mail",
    "email",
    "index",
    "home",
    "null",
    "undefined",
    "anonymous",
    "anonimo",
    "anônimo",
    "anon",
    "me",
    "new",
    "edit",
    "delete",
    "reserva",
    "reservas",
    "primordial",
    "primordiais",
    "pagamento",
    "checkout",
    "retorno",
  ]
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
);

// Intimorato is reserved but claimable with a moderation session.
export function isReservedUsername(lc) {
  return RESERVED.has(lc) || ANON_RESERVED.includes(String(lc || "").toLowerCase());
}

export function isClaimableAdminName(lc) {
  return lc === CLAIMABLE_ADMIN.toLowerCase();
}

export function normalizeUsername(raw) {
  const name = String(raw ?? "").trim();
  if (!USERNAME_RE.test(name)) return null;
  return { username: name, username_lc: name.toLowerCase() };
}

export function normalizeEmail(raw) {
  const email = String(raw ?? "").trim();
  if (!email) return null;
  if (email.length > 120) return undefined;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return undefined;
  return email.toLowerCase();
}

function b64(bytes) {
  let s = "";
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromB64(str) {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const b = atob(str.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

export async function hashPassword(password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS },
    key,
    256
  );
  return `pbkdf2-sha256$${PBKDF2_ITERATIONS}$${b64(salt)}$${b64(bits)}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2-sha256") return false;
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations < 1000 || iterations > 1_000_000) return false;
  let salt, expected;
  try {
    salt = fromB64(parts[2]);
    expected = fromB64(parts[3]);
  } catch {
    return false;
  }
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    expected.length * 8
  );
  const actual = new Uint8Array(bits);
  if (actual.length !== expected.length) return false;
  let out = 0;
  for (let i = 0; i < actual.length; i++) out |= actual[i] ^ expected[i];
  return out === 0;
}

export function randomToken() {
  return b64(crypto.getRandomValues(new Uint8Array(32)));
}

export function userCookieHeader(request, value, clear = false) {
  const url = new URL(request.url);
  const secure = url.protocol === "https:" ? "; Secure" : "";
  if (clear) {
    return `${SESSION_COOKIE}=; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=0`;
  }
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=${SESSION_TTL_SEC}`;
}

export async function createSession(db, userId) {
  const token = randomToken();
  const id = await sha256Hex(token);
  const now = new Date();
  const exp = new Date(now.getTime() + SESSION_TTL_SEC * 1000);
  await db
    .prepare("INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .bind(id, userId, now.toISOString(), exp.toISOString())
    .run();
  return token;
}

export async function destroySession(db, request) {
  const cookies = parseCookies(request.headers.get("Cookie"));
  const token = cookies[SESSION_COOKIE];
  if (token && db) {
    const id = await sha256Hex(token);
    await db.prepare("DELETE FROM sessions WHERE id = ?").bind(id).run();
  }
}

export function publicUser(row) {
  if (!row) return null;
  const out = {
    username: row.username,
    is_admin: Boolean(row.is_admin),
    is_primordial: Boolean(row.is_primordial),
    primordial_n: row.primordial_n == null ? null : Number(row.primordial_n),
    created_at: row.created_at || null,
  };
  return out;
}

export async function getSessionUser(request, env) {
  if (!env.DB) return null;
  const cookies = parseCookies(request.headers.get("Cookie"));
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  const id = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT u.id, u.username, u.username_lc, u.is_admin, u.is_primordial, u.primordial_n, u.is_paid_primordial, u.created_at, s.expires_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = ?`
  )
    .bind(id)
    .first();
  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(id).run();
    return null;
  }
  return row;
}

export { isSameOrigin, hashIp };
