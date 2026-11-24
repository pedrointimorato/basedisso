import { getSessionUser } from "./auth.js";
import { isAdmin as isTokenAdmin } from "./shared.js";
import { USERNAME_RE } from "./mentions.js";

export const FOUNDER_LC = "intimorato";

// Aceita "Nome", ">>Nome" ou "@Nome".
export function parseUserRef(raw) {
  let s = String(raw ?? "").trim();
  s = s.replace(/^(>>|&gt;&gt;|@)/, "").trim();
  if (!USERNAME_RE.test(s)) return null;
  return s.toLowerCase();
}

export async function findUserByRef(db, raw) {
  const lc = parseUserRef(raw);
  if (!lc) return null;
  return db
    .prepare(
      "SELECT id, username, username_lc, is_admin, is_primordial, primordial_n FROM users WHERE username_lc = ?"
    )
    .bind(lc)
    .first();
}

export async function isSiteAdmin(db, user) {
  if (!user || !db) return false;
  if (Number(user.is_admin) === 1) return true;
  const row = await db.prepare("SELECT 1 AS ok FROM site_admins WHERE user_id = ?").bind(user.id).first();
  return Boolean(row);
}

export async function communitiesModeratedBy(db, user) {
  if (!user || !db) return [];
  const { results } = await db
    .prepare("SELECT community_slug FROM community_admins WHERE user_id = ? ORDER BY community_slug")
    .bind(user.id)
    .all();
  return (results || []).map((r) => r.community_slug);
}

export async function isCommunityAdmin(db, user, slug) {
  if (!user || !db || !slug) return false;
  if (await isSiteAdmin(db, user)) return true;
  const row = await db
    .prepare("SELECT 1 AS ok FROM community_admins WHERE community_slug = ? AND user_id = ?")
    .bind(String(slug).toLowerCase(), user.id)
    .first();
  return Boolean(row);
}

// Contexto de administração: sessão de conta (ADM do site ou de /b/) ou ADMIN_TOKEN (= ADM do site).
export async function getAdminContext(request, env) {
  const token = await isTokenAdmin(request, env);
  const user = await getSessionUser(request, env);
  let site = token;
  let communities = [];
  if (user && env.DB) {
    if (!site) site = await isSiteAdmin(env.DB, user);
    communities = await communitiesModeratedBy(env.DB, user);
  }
  return {
    user,
    token,
    site,
    communities,
    any: site || communities.length > 0,
    loggedIn: Boolean(user) || token,
  };
}

// Pode moderar algo pertencente à comunidade `slug` (null = página fora de comunidade).
export function canModerate(ctx, slug) {
  if (ctx.site) return true;
  if (!slug) return false;
  return ctx.communities.includes(String(slug).toLowerCase());
}

// Comunidade a que pertence uma página de comentários.
export function communityOfPage(page) {
  const s = String(page || "");
  if (s === "/b/adm") return "adm";
  const m = s.match(/^\/b\/([^/]+)\/p\//);
  return m ? m[1] : null;
}

export function denyUnlessSite(ctx) {
  if (!ctx.loggedIn) return { status: 401, erro: "Entre na sua conta de ADM." };
  if (!ctx.site) return { status: 403, erro: "Apenas ADMs do site podem fazer isso." };
  return null;
}

export async function syncIsAdmin(db, userId) {
  const row = await db.prepare("SELECT 1 AS ok FROM site_admins WHERE user_id = ?").bind(userId).first();
  await db.prepare("UPDATE users SET is_admin = ? WHERE id = ?").bind(row ? 1 : 0, userId).run();
}

function userOut(r) {
  return {
    username: r.username,
    is_admin: Boolean(r.is_admin),
    is_primordial: Boolean(r.is_primordial),
    primordial_n: r.primordial_n == null ? null : Number(r.primordial_n),
  };
}

export async function listSiteAdmins(db) {
  const { results } = await db
    .prepare(
      `SELECT u.username, u.is_admin, u.is_primordial, u.primordial_n, s.created_at AS since
       FROM site_admins s JOIN users u ON u.id = s.user_id
       ORDER BY s.created_at ASC, u.username_lc ASC`
    )
    .all();
  return (results || []).map((r) => ({ ...userOut(r), desde: r.since, fundador: r.username.toLowerCase() === FOUNDER_LC }));
}

export async function listCommunityAdmins(db) {
  const { results } = await db
    .prepare(
      `SELECT c.community_slug, u.username, u.is_admin, u.is_primordial, u.primordial_n, c.created_at AS since
       FROM community_admins c JOIN users u ON u.id = c.user_id
       ORDER BY c.community_slug ASC, c.created_at ASC, u.username_lc ASC`
    )
    .all();
  const by = {};
  for (const r of results || []) {
    (by[r.community_slug] = by[r.community_slug] || []).push({ ...userOut(r), desde: r.since });
  }
  return by;
}

export async function listMembers(db, limit = 500) {
  const { results } = await db
    .prepare(
      `SELECT u.username, u.is_admin, u.is_primordial, u.primordial_n, m.joined_at
       FROM base_members m JOIN users u ON u.id = m.user_id
       ORDER BY m.joined_at DESC
       LIMIT ?`
    )
    .bind(limit)
    .all();
  const total = await db.prepare("SELECT COUNT(*) AS n FROM base_members").first();
  return {
    total: Number(total?.n || 0),
    membros: (results || []).map((r) => ({ ...userOut(r), joined_at: r.joined_at })),
  };
}
