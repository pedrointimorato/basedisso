// >>anônimo — publicar sem mostrar a própria conta.
// Gravação: user_id NULL, name 'anônimo', anon_by = id real (só no servidor), anon_badge = 'site' se ADM do site.
// Leitura: o autor real NUNCA é serializado, exceto para ADMs (site: tudo; b/: só itens da própria comunidade).
import { canModerate } from "./admins.js";

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

export function anonUsuario(row) {
  return {
    username: ANON_NAME,
    anonimo: true,
    is_admin: row && row.anon_badge === "site",
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
  for (const r of want) {
    const u = users.get(r.anon_by);
    out.set(r.id, u
      ? { username: u.username, is_admin: Boolean(u.is_admin), is_primordial: Boolean(u.is_primordial), primordial_n: u.primordial_n == null ? null : Number(u.primordial_n) }
      : { username: null, removido: true });
  }
  return out;
}

export function withRealAuthor(item, map) {
  const a = map && map.get(item.id);
  return a ? { ...item, autor_real: a } : item;
}
