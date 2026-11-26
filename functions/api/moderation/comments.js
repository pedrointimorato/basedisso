import { errorJson, json } from "../../_lib/shared.js";
import { communityOfPage, getAdminContext } from "../../_lib/admins.js";
import { attachConnections } from "../../_lib/conexoes.js";
import { B_ADMIN_COMMENT_SQL, anonUsuario, bAdminOf, isAnonRow, realAuthors, withRealAuthor } from "../../_lib/anonimo.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const ctx = await getAdminContext(request, env);
  if (!ctx.loggedIn) return errorJson("Não autorizado.", 401);
  if (!ctx.any) return errorJson("Apenas ADMs podem moderar.", 403);
  if (!env.DB) return errorJson("Serviço de comentários indisponível.", 503);

  const url = new URL(request.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 100) || 100));
  const sel = `SELECT c.id, c.page, c.parent_id, c.name, c.body, c.created_at, c.hidden, c.author_deleted_at, c.pinned_at, c.user_id, c.anon_by, c.anon_badge, c.ip_hash,
            u.username, u.is_admin, ${B_ADMIN_COMMENT_SQL}
     FROM comments c
     LEFT JOIN users u ON u.id = c.user_id`;
  let results;
  if (ctx.site) {
    ({ results } = await env.DB.prepare(`${sel} ORDER BY c.created_at DESC LIMIT ?`).bind(limit).all());
  } else {
    const conds = [];
    const binds = [];
    for (const slug of ctx.communities) {
      conds.push("c.page LIKE ?");
      binds.push(`/b/${slug}/p/%`);
      if (slug === "adm") {
        conds.push("c.page = ?");
        binds.push("/b/adm");
      }
    }
    ({ results } = await env.DB.prepare(
      `${sel} WHERE (${conds.join(" OR ")}) ORDER BY c.created_at DESC LIMIT ?`
    )
      .bind(...binds, limit)
      .all());
    results = (results || []).filter((r) => ctx.communities.includes(communityOfPage(r.page)));
  }

  const reais = await realAuthors(env.DB, results, ctx, (r) => communityOfPage(r.page));
  const comentarios = (results || []).map((row) => withRealAuthor({
      id: row.id,
      page: row.page,
      parent_id: row.parent_id,
      name: isAnonRow(row) ? "anônimo" : row.username || row.name,
      body: row.body,
      created_at: row.created_at,
      hidden: Boolean(row.hidden),
      excluido_pelo_autor: Boolean(row.author_deleted_at),
      fixado: Boolean(row.pinned_at),
      anonimo: isAnonRow(row),
      usuario: isAnonRow(row) ? anonUsuario(row) : row.username
        ? { username: row.username, is_admin: Boolean(row.is_admin), b_admin: bAdminOf(row) }
        : null,
    }, reais));
  await attachConnections(env.DB, results, comentarios, ctx, (r) => communityOfPage(r.page));
  return json({ comentarios });
}
