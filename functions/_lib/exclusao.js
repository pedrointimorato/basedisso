// Exclusão pelo próprio autor (comentários e postagens).
// Com respostas/comentários: apaga o conteúdo e marca author_deleted_at (a thread continua).
// Sem respostas/comentários: DELETE de verdade.
import { getSessionUser } from "./auth.js";
import { errorJson, isSameOrigin } from "./shared.js";

export async function authorGuard(request, env) {
  if (!env.DB) return { res: errorJson("Serviço indisponível.", 503) };
  const user = await getSessionUser(request, env);
  if (!user) return { res: errorJson("Entre na sua conta para excluir.", 401) };
  if (!isSameOrigin(request)) return { res: errorJson("Origem não permitida.", 403) };
  return { user };
}

async function childCount(db, id) {
  const row = await db.prepare("SELECT COUNT(*) AS n FROM comments WHERE parent_id = ?").bind(id).first();
  return Number(row?.n || 0);
}

// Depois de um DELETE: sobe a thread apagando "cascas" excluídas pelo autor que ficaram sem respostas,
// e a postagem excluída pelo autor que ficou sem comentários.
async function pruneAfterDelete(db, parentId, page) {
  let pid = parentId;
  let guard = 0;
  while (pid && guard++ < 50) {
    const p = await db.prepare("SELECT id, parent_id, author_deleted_at FROM comments WHERE id = ?").bind(pid).first();
    if (!p || !p.author_deleted_at) break;
    if ((await childCount(db, p.id)) > 0) break;
    await db.prepare("DELETE FROM comments WHERE id = ?").bind(p.id).run();
    pid = p.parent_id;
  }
  const m = String(page || "").match(/^\/b\/[^/]+\/p\/([0-9a-f-]{36})$/);
  if (m) {
    const post = await db.prepare("SELECT id, author_deleted_at FROM posts WHERE id = ?").bind(m[1]).first();
    if (post && post.author_deleted_at) {
      const left = await db.prepare("SELECT COUNT(*) AS n FROM comments WHERE page = ?").bind(page).first();
      if (!Number(left?.n || 0)) await db.prepare("DELETE FROM posts WHERE id = ?").bind(post.id).run();
    }
  }
}

export async function deleteOwnComment(db, user, id) {
  const row = await db
    .prepare("SELECT id, page, parent_id, user_id, author_deleted_at FROM comments WHERE id = ?")
    .bind(id)
    .first();
  if (!row || row.author_deleted_at) return { status: 404, erro: "Comentário não encontrado." };
  if (!row.user_id) return { status: 403, erro: "Comentários anônimos não podem ser excluídos pelo autor; peça a um ADM." };
  if (row.user_id !== user.id) return { status: 403, erro: "Você só pode excluir os seus próprios comentários." };
  if ((await childCount(db, row.id)) > 0) {
    await db
      .prepare("UPDATE comments SET body = '', author_deleted_at = ? WHERE id = ?")
      .bind(new Date().toISOString(), row.id)
      .run();
    return { ok: true, modo: "marcado" };
  }
  await db.prepare("DELETE FROM comments WHERE id = ?").bind(row.id).run();
  await pruneAfterDelete(db, row.parent_id, row.page);
  return { ok: true, modo: "apagado" };
}

export async function deleteOwnPost(db, user, id) {
  const row = await db
    .prepare("SELECT id, community, user_id, author_deleted_at FROM posts WHERE id = ?")
    .bind(id)
    .first();
  if (!row || row.author_deleted_at) return { status: 404, erro: "Postagem não encontrada." };
  if (!row.user_id) return { status: 403, erro: "Postagens anônimas não podem ser excluídas pelo autor; peça a um ADM." };
  if (row.user_id !== user.id) return { status: 403, erro: "Você só pode excluir as suas próprias postagens." };
  const page = `/b/${row.community}/p/${row.id}`;
  const c = await db.prepare("SELECT COUNT(*) AS n FROM comments WHERE page = ?").bind(page).first();
  if (Number(c?.n || 0) > 0) {
    await db
      .prepare("UPDATE posts SET title = '', body = '', link = NULL, sticky = 0, author_deleted_at = ? WHERE id = ?")
      .bind(new Date().toISOString(), row.id)
      .run();
    return { ok: true, modo: "marcado", community: row.community };
  }
  await db.prepare("DELETE FROM posts WHERE id = ?").bind(row.id).run();
  return { ok: true, modo: "apagado", community: row.community };
}
