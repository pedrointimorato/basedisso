import { errorJson, isAdmin, json } from "../../_lib/shared.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!(await isAdmin(request, env))) return errorJson("Não autorizado.", 401);
  if (!env.DB) return errorJson("Serviço de comentários indisponível.", 503);

  const url = new URL(request.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 100) || 100));
  const { results } = await env.DB.prepare(
    `SELECT id, page, parent_id, name, body, created_at, hidden
     FROM comments
     ORDER BY created_at DESC
     LIMIT ?`
  )
    .bind(limit)
    .all();

  return json({
    comentarios: (results || []).map((row) => ({
      id: row.id,
      page: row.page,
      parent_id: row.parent_id,
      name: row.name,
      body: row.body,
      created_at: row.created_at,
      hidden: Boolean(row.hidden),
    })),
  });
}
