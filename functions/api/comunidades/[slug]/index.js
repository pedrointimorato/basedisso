import { errorJson, json } from "../../../_lib/shared.js";
import { getCommunityDb, communityHref, publicPost } from "../../../_lib/comunidades.js";
import { normalizeSort, listVisiblePosts } from "../../../_lib/posts.js";

export async function onRequestGet(context) {
  const { env, params, request } = context;
  const sort = normalizeSort(new URL(request.url).searchParams.get("sort"));
  const community = await getCommunityDb(env.DB, params.slug);
  if (!community) return errorJson("Comunidade não encontrada.", 404);
  const posts = env.DB ? (await listVisiblePosts(env.DB, community.slug, 100, sort)).map((row) => publicPost(row)) : [];
  return json({
    comunidade: { ...community, href: communityHref(community.slug) },
    postagens: posts,
  });
}
