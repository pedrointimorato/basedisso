import { getCommunity, UUID_RE } from "./comunidades.js";

const FIXED_COMMENT_PAGES = new Set(["/s", "/s/biblia-amarela", "/b/adm"]);
const NAME_MAX = 80;
const BODY_MAX = 2000;
const RATE_POST_PER_MIN = 3;
const RATE_POST_PER_HOUR = 15;
const RATE_LOGIN_PER_15MIN = 5;
const COOKIE_NAME = "bd_mod";
const COOKIE_TTL_SEC = 60 * 60 * 24;

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

export function errorJson(message, status = 400) {
  return json({ erro: message }, status);
}

export function normalizePage(raw) {
  if (!raw || typeof raw !== "string") return null;
  let s = raw.trim();
  try {
    s = decodeURIComponent(s);
  } catch {
    /* keep raw */
  }
  s = s.split("?")[0].split("#")[0];
  if (!s.startsWith("/")) s = `/${s}`;
  s = s.replace(/\/index\.html$/i, "/").replace(/\.html$/i, "");
  if (s.length > 1) s = s.replace(/\/+$/, "");
  s = s.replace(/\/{2,}/g, "/");
  if (s.length > 200 || s.includes("..") || /[^a-zA-Z0-9/_-]/.test(s)) return null;
  if (s === "/adm") s = "/b/adm";
  if (FIXED_COMMENT_PAGES.has(s)) return s;
  const m = s.match(/^\/b\/([a-z][a-z0-9_-]{0,20})\/p\/([0-9a-f-]{36})$/i);
  if (m && getCommunity(m[1]) && UUID_RE.test(m[2])) {
    return `/b/${m[1].toLowerCase()}/p/${m[2].toLowerCase()}`;
  }
  return null;
}

export function sanitizeName(raw) {
  const name = String(raw ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, NAME_MAX);
  return name || "anônimo";
}

export function sanitizeBody(raw) {
  return String(raw ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim();
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function clientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Real-IP") ||
    "127.0.0.1"
  );
}

export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashIp(request, env) {
  const salt = env.IP_HASH_SALT || env.ADMIN_TOKEN || "local-dev-salt";
  return sha256Hex(`${salt}|${clientIp(request)}`);
}

export async function hmacHex(keyStr, msg) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(keyStr),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function safeEqual(a, b) {
  const enc = new TextEncoder();
  const aa = enc.encode(String(a ?? ""));
  const bb = enc.encode(String(b ?? ""));
  const n = Math.max(aa.length, bb.length, 1);
  let out = aa.length ^ bb.length;
  for (let i = 0; i < n; i++) out |= (aa[i] || 0) ^ (bb[i] || 0);
  return out === 0;
}

export function isSameOrigin(request) {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (origin) return origin === url.origin;
  const referer = request.headers.get("Referer");
  if (!referer) return true;
  try {
    return new URL(referer).origin === url.origin;
  } catch {
    return false;
  }
}

export async function recordRate(db, ipHash, kind) {
  const now = new Date().toISOString();
  await db
    .prepare("INSERT INTO rate_events (ip_hash, kind, created_at) VALUES (?, ?, ?)")
    .bind(ipHash, kind, now)
    .run();
}

export async function countRate(db, ipHash, kind, sinceIso) {
  const row = await db
    .prepare(
      "SELECT COUNT(*) AS n FROM rate_events WHERE ip_hash = ? AND kind = ? AND created_at >= ?"
    )
    .bind(ipHash, kind, sinceIso)
    .first();
  return Number(row?.n || 0);
}

export async function checkPostRate(db, ipHash) {
  const now = Date.now();
  const perMin = await countRate(db, ipHash, "post", new Date(now - 60 * 1000).toISOString());
  if (perMin >= RATE_POST_PER_MIN) {
    return "Muitas tentativas. Espere um minuto e tente de novo.";
  }
  const perHour = await countRate(db, ipHash, "post", new Date(now - 60 * 60 * 1000).toISOString());
  if (perHour >= RATE_POST_PER_HOUR) {
    return "Você atingiu o limite de envios por hora. Tente mais tarde.";
  }
  return null;
}

export async function checkLoginRate(db, ipHash) {
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const n = await countRate(db, ipHash, "login_fail", since);
  return n >= RATE_LOGIN_PER_15MIN
    ? "Muitas tentativas de entrada. Espere alguns minutos."
    : null;
}

export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

export async function isAdmin(request, env) {
  const token = env.ADMIN_TOKEN;
  if (!token) return false;
  const auth = request.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m && safeEqual(m[1].trim(), token)) return true;

  const cookies = parseCookies(request.headers.get("Cookie"));
  const raw = cookies[COOKIE_NAME];
  if (!raw) return false;
  const dot = raw.indexOf(".");
  if (dot < 1) return false;
  const exp = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum * 1000 < Date.now()) return false;
  const expected = await hmacHex(token, `basedisso-mod|${exp}`);
  return safeEqual(sig, expected);
}

export async function sessionCookieValue(env) {
  const exp = Math.floor(Date.now() / 1000) + COOKIE_TTL_SEC;
  const sig = await hmacHex(env.ADMIN_TOKEN, `basedisso-mod|${exp}`);
  return `${exp}.${sig}`;
}

export function cookieHeader(value, clear = false) {
  if (clear) {
    return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
  }
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${COOKIE_TTL_SEC}`;
}

export function publicComment(row) {
  return {
    id: row.id,
    page: row.page,
    parent_id: row.parent_id,
    name: row.name,
    body: row.body,
    created_at: row.created_at,
  };
}

export { NAME_MAX, BODY_MAX, COOKIE_NAME, COOKIE_TTL_SEC };
