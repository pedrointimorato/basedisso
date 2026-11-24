export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,23}$/;
export const NEW_SLUG_RE = /^[a-z0-9][a-z0-9_-]{1,23}$/;
export const RESERVED_SLUGS = new Set([
  "membros", "moderar", "criar", "novo", "api", "p", "admin", "index", "busca",
  "cadastro", "entrar", "s", "f", "assets",
]);
// Pastas estáticas dentro de /b/ (servidas pelos arquivos, não pela Function dinâmica).
export const STATIC_B_DIRS = new Set(["adm", "atoa", "membros"]);

export const COMMUNITIES = {
  adm: {
    slug: "adm",
    name: "adm",
    title: "adm",
    description:
      "Solicitações, queixas, elogios, sugestões e ofertas ao administrador. Qualquer pessoa pode postar, com nome opcional ou em conta.",
    posting: "open",
  },
  atoa: {
    slug: "atoa",
    name: "À toa",
    title: "atoa",
    description: "Off topic. Conversa à toa, sem assunto definido. Qualquer pessoa pode postar, com nome opcional ou em conta.",
    posting: "open",
  },
};

export function getCommunity(slug) {
  if (!slug || typeof slug !== "string") return null;
  return COMMUNITIES[slug.trim().toLowerCase()] || null;
}

export function listCommunities() {
  return Object.values(COMMUNITIES);
}

function rowToCommunity(row) {
  const base = COMMUNITIES[row.slug];
  return {
    slug: row.slug,
    name: base ? base.name : row.name,
    title: base ? base.title : row.slug,
    description: base ? base.description : row.description || "",
    posting: row.posting || "open",
    created_at: row.created_at || null,
    created_by: row.created_by || null,
    dynamic: !base,
  };
}

// Busca a comunidade no D1 (com os textos fixos de adm/atoa como base).
export async function getCommunityDb(db, slug) {
  if (!slug || typeof slug !== "string") return null;
  const s = slug.trim().toLowerCase();
  if (!SLUG_RE.test(s)) return null;
  if (!db) return COMMUNITIES[s] || null;
  let row = null;
  try {
    row = await db.prepare("SELECT * FROM communities WHERE slug = ?").bind(s).first();
  } catch {
    row = null;
  }
  if (row) return rowToCommunity(row);
  return COMMUNITIES[s] ? { ...COMMUNITIES[s], dynamic: false } : null;
}

export async function listCommunitiesDb(db) {
  if (!db) return listCommunities();
  let rows = [];
  try {
    const out = await db.prepare("SELECT * FROM communities ORDER BY created_at ASC, slug ASC").all();
    rows = out.results || [];
  } catch {
    rows = [];
  }
  const seen = new Set(rows.map((r) => r.slug));
  const list = rows.map(rowToCommunity);
  for (const c of listCommunities()) if (!seen.has(c.slug)) list.unshift({ ...c, dynamic: false });
  return list;
}

export function postPageKey(slug, id) {
  return `/b/${slug}/p/${id}`;
}

export function postHref(slug, id) {
  return `/b/${slug}/p/${id}`;
}

export function communityHref(slug) {
  return `/b/${slug}/`;
}

export function publicPost(row, extra = {}) {
  const usuario = row.username
    ? {
        username: row.username,
        is_admin: Boolean(row.is_admin),
        is_primordial: Boolean(row.is_primordial),
        primordial_n: row.primordial_n == null ? null : Number(row.primordial_n),
      }
    : null;
  return {
    id: row.id,
    community: row.community,
    title: row.title,
    body: row.body || "",
    link: row.link || null,
    name: usuario ? usuario.username : row.name,
    usuario,
    created_at: row.created_at,
    sticky: Boolean(row.sticky),
    url: postHref(row.community, row.id),
    comment_count: Number(row.comment_count || 0),
    ...extra,
  };
}

export const TITLE_MAX = 200;
export const LINK_MAX = 500;

export function sanitizeTitle(raw) {
  return String(raw ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, TITLE_MAX);
}

export function sanitizeLink(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if (s.length > LINK_MAX) return false;
  let u;
  try {
    u = new URL(s);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  return u.toString();
}
