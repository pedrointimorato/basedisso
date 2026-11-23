export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const SLUG_RE = /^[a-z][a-z0-9_-]{0,20}$/;

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
