// >>anônimo — publicar sem mostrar a própria conta.
// Gravação: user_id NULL, name 'anônimo', anon_by = id real (só no servidor), anon_badge = 'site' se ADM do site.
// Leitura: o autor real NUNCA é serializado, exceto para ADMs (site: tudo; b/: só itens da própria comunidade).
import { canModerate, communityOfPage, isSiteAdmin } from "./admins.js";
import { readAvatar } from "./ascii.js";

export const ANON_NAME = "anônimo";

export function foldName(raw) {
  return String(raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

// Nomes que contam como >>anônimo (inclui o padrão de quem posta deslogado sem nome).
export function isAnonName(raw) {
  const f = foldName(raw);
  return f === "" || f === "anonimo";
}

// Variações reservadas no cadastro (o perfil /@anônimo é coletivo).
export const ANON_RESERVED = ["anonimo", "anonima", "anonimos", "anonimas", "anonymous", "anon", "anonimo_", "an0nimo"];

export function isAnonRow(row) {
  return Boolean(row && !row.user_id && (row.anon_by || isAnonName(row.name)));
}

// b/ de um item: posts têm community; comentários, a página.
export function itemSlug(row) {
  if (!row) return null;
  return row.community || communityOfPage(row.page) || null;
}

// Selo [b] (ADM da b/ do item), calculado ao vivo pela junção b_admin_flag. ADM do site mostra só [M].
export function bAdminOf(row) {
  return row && row.b_admin_flag && !row.is_admin ? itemSlug(row) : null;
}

// SQL: 1 se o autor (alias.user_id) é ADM da b/ do item.
export const B_ADMIN_POST_SQL = "(SELECT 1 FROM community_admins bca WHERE bca.user_id = p.user_id AND bca.community_slug = p.community) AS b_admin_flag";
export const B_ADMIN_COMMENT_SQL = "(SELECT 1 FROM community_admins bca WHERE bca.user_id = c.user_id AND (substr(c.page, 1, length(bca.community_slug) + 6) = '/b/' || bca.community_slug || '/p/' OR (bca.community_slug = 'adm' AND c.page = '/b/adm'))) AS b_admin_flag";

export async function isBAdmin(db, user, slug) {
  if (!db || !user || !slug) return false;
  const r = await db.prepare("SELECT 1 AS ok FROM community_admins WHERE user_id = ? AND community_slug = ?").bind(user.id, String(slug).toLowerCase()).first();
  return Boolean(r);
}

// Selo gravado no item anônimo no momento da postagem: 'site' ([M]), 'b' ([b]) ou null.
export async function anonBadgeAtPost(db, user, slug) {
  if (await isSiteAdmin(db, user)) return "site";
  if (await isBAdmin(db, user, slug)) return "b";
  return null;
}

export function anonUsuario(row) {
  return {
    username: ANON_NAME,
    anonimo: true,
    is_admin: row && row.anon_badge === "site",
    b_admin: row && row.anon_badge === "b" ? itemSlug(row) : null,
    is_primordial: false,
    primordial_n: null,
    avatar: null,
    avatar_cores: null,
  };
}

export function ownerId(row) {
  return (row && (row.user_id || row.anon_by)) || null;
}

export function isOwn(row, viewer) {
  return Boolean(viewer && viewer.id && ownerId(row) === viewer.id);
}

export function canSeeRealAuthor(ctx, slug) {
  return Boolean(ctx && ctx.any && canModerate(ctx, slug));
}

// Mapa id do item -> { username, is_admin, ... } do autor real, só para itens que o ctx pode ver.
export async function realAuthors(db, rows, ctx, slugOf) {
  const out = new Map();
  if (!db || !ctx || !ctx.any) return out;
  const want = (rows || []).filter((r) => r && r.anon_by && !r.author_deleted_at && canSeeRealAuthor(ctx, slugOf(r)));
  const ids = [...new Set(want.map((r) => r.anon_by))];
  if (!ids.length) return out;
  const users = new Map();
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const { results } = await db
      .prepare(`SELECT id, username, is_admin, is_primordial, primordial_n FROM users WHERE id IN (${chunk.map(() => "?").join(",")})`)
      .bind(...chunk)
      .all();
    for (const u of results || []) users.set(u.id, u);
  }
  const bAdm = new Set();
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const { results } = await db
      .prepare(`SELECT user_id, community_slug FROM community_admins WHERE user_id IN (${chunk.map(() => "?").join(",")})`)
      .bind(...chunk)
      .all();
    for (const r of results || []) bAdm.add(r.user_id + "|" + r.community_slug);
  }
  for (const r of want) {
    const u = users.get(r.anon_by);
    const slug = itemSlug(r);
    out.set(r.id, u
      ? { username: u.username, is_admin: Boolean(u.is_admin), b_admin: !u.is_admin && slug && bAdm.has(u.id + "|" + slug) ? slug : null, is_primordial: Boolean(u.is_primordial), primordial_n: u.primordial_n == null ? null : Number(u.primordial_n) }
      : { username: null, removido: true });
  }
  return out;
}

export function withRealAuthor(item, map) {
  const a = map && map.get(item.id);
  return a ? { ...item, autor_real: a } : item;
}

// Avatar do perfil coletivo >>anônimo (editável por ADMs do site) aparece nos itens anônimos.
export const ANON_PROFILE_ID = "anonimo";
export async function attachAnonAvatar(db, items) {
  const alvo = (items || []).filter((it) => it && it.usuario && it.usuario.anonimo);
  if (!db || !alvo.length) return items;
  const av = await readAvatar(db, ANON_PROFILE_ID);
  if (!av) return items;
  for (const it of alvo) it.usuario = { ...it.usuario, avatar: av.arte, avatar_cores: av.cores };
  return items;
}
