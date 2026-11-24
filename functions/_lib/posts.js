import { postPageKey } from "./comunidades.js";

export function postsSelectSql() {
  return `SELECT p.id, p.community, p.title, p.body, p.link, p.name, p.user_id,
            p.created_at, p.hidden, p.sticky,
            u.username, u.is_admin, u.is_primordial, u.primordial_n,
            (SELECT COUNT(*) FROM comments c
              WHERE c.hidden = 0 AND c.page = '/b/' || p.community || '/p/' || p.id) AS comment_count
     FROM posts p
     LEFT JOIN users u ON u.id = p.user_id`;
}

export async function getVisiblePost(db, id) {
  const row = await db
    .prepare(`${postsSelectSql()} WHERE p.id = ?`)
    .bind(id)
    .first();
  return row || null;
}

export const POST_SORTS = {
  links: "p.sticky DESC, p.created_at DESC",
  novos: "p.created_at DESC",
  melhores: "comment_count DESC, p.created_at DESC",
};

export function normalizeSort(raw) {
  const s = String(raw || "").trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(POST_SORTS, s) ? s : "links";
}

export async function listVisiblePosts(db, slug, limit = 100, sort = "links") {
  const cap = Math.min(200, Math.max(1, Number(limit) || 100));
  const order = POST_SORTS[normalizeSort(sort)];
  const { results } = await db
    .prepare(
      `${postsSelectSql()}
       WHERE p.community = ? AND p.hidden = 0
       ORDER BY ${order}
       LIMIT ?`
    )
    .bind(slug, cap)
    .all();
  return results || [];
}

export { postPageKey };
