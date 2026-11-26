// Fixar postagens/comentários (ADMs). Limites fáceis de mudar aqui.
export const MAX_PINNED_POSTS_PER_COMMUNITY = 3;
export const MAX_PINNED_COMMENTS_PER_THREAD = 3;

function pinnedBy(ctx) {
  return ctx.user ? ctx.user.id : "admin-token";
}

export async function setPostPin(db, ctx, post, fixar) {
  if (!fixar) {
    await db.prepare("UPDATE posts SET pinned_at = NULL, pinned_by = NULL WHERE id = ?").bind(post.id).run();
    return { ok: true, fixado: false };
  }
  if (post.hidden) return { status: 409, erro: "Postagens ocultas não podem ser fixadas." };
  if (post.author_deleted_at) return { status: 409, erro: "Postagens excluídas pelo autor não podem ser fixadas." };
  if (post.pinned_at) return { ok: true, fixado: true };
  const n = await db
    .prepare("SELECT COUNT(*) AS n FROM posts WHERE community = ? AND pinned_at IS NOT NULL AND hidden = 0 AND author_deleted_at IS NULL")
    .bind(post.community)
    .first();
  if (Number(n?.n || 0) >= MAX_PINNED_POSTS_PER_COMMUNITY) {
    return { status: 409, erro: `Já há ${MAX_PINNED_POSTS_PER_COMMUNITY} postagens fixadas em b/${post.community}. Desafixe uma antes.` };
  }
  await db.prepare("UPDATE posts SET pinned_at = ?, pinned_by = ? WHERE id = ?").bind(new Date().toISOString(), pinnedBy(ctx), post.id).run();
  return { ok: true, fixado: true };
}

export async function setCommentPin(db, ctx, c, fixar) {
  if (!fixar) {
    await db.prepare("UPDATE comments SET pinned_at = NULL, pinned_by = NULL WHERE id = ?").bind(c.id).run();
    return { ok: true, fixado: false };
  }
  if (c.parent_id) return { status: 400, erro: "Só comentários de primeiro nível podem ser fixados." };
  if (c.hidden) return { status: 409, erro: "Comentários ocultos não podem ser fixados." };
  if (c.author_deleted_at) return { status: 409, erro: "Comentários excluídos pelo autor não podem ser fixados." };
  if (c.pinned_at) return { ok: true, fixado: true };
  const n = await db
    .prepare("SELECT COUNT(*) AS n FROM comments WHERE page = ? AND pinned_at IS NOT NULL AND hidden = 0 AND author_deleted_at IS NULL")
    .bind(c.page)
    .first();
  if (Number(n?.n || 0) >= MAX_PINNED_COMMENTS_PER_THREAD) {
    return { status: 409, erro: `Já há ${MAX_PINNED_COMMENTS_PER_THREAD} comentários fixados nesta página. Desafixe um antes.` };
  }
  await db.prepare("UPDATE comments SET pinned_at = ?, pinned_by = ? WHERE id = ?").bind(new Date().toISOString(), pinnedBy(ctx), c.id).run();
  return { ok: true, fixado: true };
}
