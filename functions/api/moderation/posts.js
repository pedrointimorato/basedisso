import { errorJson, json } from "../../_lib/shared.js";
import { getAdminContext } from "../../_lib/admins.js";
import { publicPost } from "../../_lib/comunidades.js";
import { postsSelectSql } from "../../_lib/posts.js";
import { realAuthors, withRealAuthor } from "../../_lib/anonimo.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const ctx = await getAdminContext(request, env);
  if (!ctx.loggedIn) return errorJson("Não autorizado.", 401);
  if (!ctx.any) return errorJson("Apenas ADMs podem moderar.", 403);
  if (!env.DB) return errorJson("Serviço de postagens indisponível.", 503);
  const url = new URL(request.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 100) || 100));
  let results;
  if (ctx.site) {
    ({ results } = await env.DB.prepare(`${postsSelectSql()} ORDER BY p.created_at DESC LIMIT ?`)
      .bind(limit)
      .all());
  } else {
    const ph = ctx.communities.map(() => "?").join(",");
    ({ results } = await env.DB.prepare(
      `${postsSelectSql()} WHERE p.community IN (${ph}) ORDER BY p.created_at DESC LIMIT ?`
    )
      .bind(...ctx.communities, limit)
      .all());
  }
  const reais = await realAuthors(env.DB, results, ctx, (r) => r.community);
  return json({
    postagens: (results || []).map((row) => withRealAuthor(publicPost(row, { hidden: Boolean(row.hidden) }), reais)),
  });
}
