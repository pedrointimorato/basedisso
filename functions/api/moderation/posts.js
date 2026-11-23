import { errorJson, isAdmin, json } from "../../_lib/shared.js";
import { publicPost } from "../../_lib/comunidades.js";
import { postsSelectSql } from "../../_lib/posts.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!(await isAdmin(request, env))) return errorJson("Não autorizado.", 401);
  if (!env.DB) return errorJson("Serviço de postagens indisponível.", 503);
  const url = new URL(request.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 100) || 100));
  const { results } = await env.DB.prepare(
    `${postsSelectSql()} ORDER BY p.created_at DESC LIMIT ?`
  )
    .bind(limit)
    .all();
  return json({
    postagens: (results || []).map((row) => publicPost(row, { hidden: Boolean(row.hidden) })),
  });
}
