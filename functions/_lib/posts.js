import { postPageKey } from "./comunidades.js";
import { B_ADMIN_POST_SQL } from "./anonimo.js";

export function postsSelectSql() {
  return `SELECT p.id, p.community, p.title, p.body, p.link, p.name, p.user_id,
            p.created_at, p.hidden, p.sticky, p.author_deleted_at, p.pinned_at, p.anon_by, p.anon_badge, p.ip_hash,
            u.username, u.is_admin, u.is_primordial, u.primordial_n, av.art AS avatar, av.colors AS avatar_colors,
            pl.closes_at AS poll_closes_at, ${B_ADMIN_POST_SQL},
            (SELECT COUNT(*) FROM poll_votes pv WHERE pv.post_id = p.id) AS poll_votes,
            (SELECT COUNT(*) FROM comments c
              WHERE c.hidden = 0 AND c.page = '/b/' || p.community || '/p/' || p.id) AS comment_count
     FROM posts p
     LEFT JOIN users u ON u.id = p.user_id
     LEFT JOIN profile_avatar av ON av.user_id = p.user_id
     LEFT JOIN polls pl ON pl.post_id = p.id`;
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
       WHERE p.community = ? AND p.hidden = 0 AND p.author_deleted_at IS NULL
       ORDER BY (p.pinned_at IS NULL) ASC, p.pinned_at DESC, ${order}
       LIMIT ?`
    )
    .bind(slug, cap)
    .all();
  return results || [];
}

export { postPageKey };
