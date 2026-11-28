// MOR-43: postagens escritas no próprio perfil. Só com conta; texto obrigatório.
// Mídia: as regras de MOR-38 para páginas fora de b/ (só ADM do site).
import { publicMidia } from "./midia.js";
import { maskFor } from "./ascii.js";

export const PERFIL_FEED_MAX = 40;
export const PERFIL_PAGE_MAX = 50;
export const EXCERPT_MAX = 160;
export const EXCERPT_FEED_MAX = 420;

// Linhas que não são texto (indicador de áudio/voz colado no corpo, etc.) saem do trecho; o texto guardado não muda.
const ZW_RE = /[\u200B-\u200D\uFEFF\uFE0E\uFE0F]/g;
const WAVE_RE = /[၊။|│┃┆┊丨❚❙❘]/g;
const PLAY_RE = /[▶►▸▷◁◀◼■⬛⏹⏯♪♫♩🔊🎤]/;
const DURATION_RE = /\b\d{1,2}:\d{2}\b/;

export function isMediaIndicatorLine(line) {
  const s = String(line || "").replace(ZW_RE, "").trim();
  if (!s) return false;
  const waves = (s.match(WAVE_RE) || []).length;
  const hasPlay = PLAY_RE.test(s);
  const hasDur = DURATION_RE.test(s);
  return (hasPlay && hasDur) || (waves >= 4 && (hasDur || hasPlay)) || waves >= 6;
}

export function excerptOf(body, n = EXCERPT_MAX) {
  const t = String(body || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .split("\n")
    .filter((line) => !isMediaIndicatorLine(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!t) return "";
  if (t.length <= n) return t;
  return t.slice(0, n).replace(/\s+\S*$/, "") + "…";
}

export function publicProfilePost(row, extra = {}) {
  const u = row.username
    ? {
        username: row.username,
        is_admin: Boolean(row.is_admin),
        is_primordial: Boolean(row.is_primordial),
        primordial_n: row.primordial_n == null ? null : Number(row.primordial_n),
        avatar: row.avatar || null,
        avatar_cores: row.avatar ? maskFor(row.avatar, row.avatar_colors) : null,
      }
    : null;
  return {
    id: row.id,
    body: row.body || "",
    created_at: row.created_at,
    hidden: Boolean(row.hidden),
    usuario: u,
    url: u ? `/@${u.username}#pp-${row.id}` : "/@",
    ...extra,
  };
}

const SELECT = `SELECT p.id, p.user_id, p.body, p.created_at, p.hidden, p.author_deleted_at,
       u.username, u.is_admin, u.is_primordial, u.primordial_n, av.art AS avatar, av.colors AS avatar_colors
  FROM profile_posts p
  JOIN users u ON u.id = p.user_id
  LEFT JOIN profile_avatar av ON av.user_id = p.user_id`;

export async function listProfilePosts(db, { userId = null, limit = PERFIL_FEED_MAX, includeHidden = false } = {}) {
  if (!db) return [];
  const cap = Math.min(100, Math.max(1, Number(limit) || PERFIL_FEED_MAX));
  const vis = includeHidden ? "p.author_deleted_at IS NULL" : "p.hidden = 0 AND p.author_deleted_at IS NULL";
  const sql = userId
    ? `${SELECT} WHERE p.user_id = ? AND ${vis} ORDER BY p.created_at DESC LIMIT ?`
    : `${SELECT} WHERE ${vis} ORDER BY p.created_at DESC LIMIT ?`;
  const binds = userId ? [userId, cap] : [cap];
  try {
    const { results } = await db.prepare(sql).bind(...binds).all();
    return results || [];
  } catch {
    return []; // tabela ausente antes da migration
  }
}

export async function getProfilePost(db, id) {
  if (!db || !id) return null;
  try {
    return (await db.prepare(`${SELECT} WHERE p.id = ?`).bind(id).first()) || null;
  } catch {
    return null;
  }
}

export { publicMidia };
