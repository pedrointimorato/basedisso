import { errorJson, json } from "../../_lib/shared.js";
import { getCommunity, communityHref, publicPost } from "../../_lib/comunidades.js";
import { listVisiblePosts } from "../../_lib/posts.js";

export async function onRequestGet(context) {
  const { env, params } = context;
  const community = getCommunity(params.slug);
  if (!community) return errorJson("Comunidade não encontrada.", 404);
  const posts = env.DB ? (await listVisiblePosts(env.DB, community.slug)).map((row) => publicPost(row)) : [];
  return json({
    comunidade: { ...community, href: communityHref(community.slug) },
    postagens: posts,
  });
}
