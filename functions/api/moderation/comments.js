import { errorJson, isAdmin, json } from "../../_lib/shared.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!(await isAdmin(request, env))) return errorJson("Não autorizado.", 401);
  if (!env.DB) return errorJson("Serviço de comentários indisponível.", 503);

  const url = new URL(request.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 100) || 100));
  const { results } = await env.DB.prepare(
    `SELECT c.id, c.page, c.parent_id, c.name, c.body, c.created_at, c.hidden,
            u.username, u.is_admin
     FROM comments c
     LEFT JOIN users u ON u.id = c.user_id
     ORDER BY c.created_at DESC
     LIMIT ?`
  )
    .bind(limit)
    .all();

  return json({
    comentarios: (results || []).map((row) => ({
      id: row.id,
      page: row.page,
      parent_id: row.parent_id,
      name: row.username || row.name,
      body: row.body,
      created_at: row.created_at,
      hidden: Boolean(row.hidden),
      usuario: row.username
        ? { username: row.username, is_admin: Boolean(row.is_admin) }
        : null,
    })),
  });
}
