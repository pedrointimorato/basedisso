import { errorJson, json } from "../../../_lib/shared.js";
import { getCommunityDb, communityHref, publicPost } from "../../../_lib/comunidades.js";
import { normalizeSort, listVisiblePosts } from "../../../_lib/posts.js";
import { getSessionUser } from "../../../_lib/auth.js";
import { canModerate, getAdminContext, isSiteAdmin } from "../../../_lib/admins.js";
import { attachConnections } from "../../../_lib/conexoes.js";
import { attachAnonAvatar } from "../../../_lib/anonimo.js";
import { ANON_NAME, isOwn, realAuthors, withRealAuthor } from "../../../_lib/anonimo.js";

export async function onRequestGet(context) {
  const { env, params, request } = context;
  const sort = normalizeSort(new URL(request.url).searchParams.get("sort"));
  const community = await getCommunityDb(env.DB, params.slug);
  if (!community) return errorJson("Comunidade não encontrada.", 404);
  const viewer = env.DB ? await getSessionUser(request, env) : null;
  const ctx = env.DB && viewer ? await getAdminContext(request, env) : null;
  const rows = env.DB ? await listVisiblePosts(env.DB, community.slug, 100, sort) : [];
  const reais = await realAuthors(env.DB, rows, ctx, (r) => r.community);
  const posts = rows.map((row) => withRealAuthor(publicPost(row, { proprio: isOwn(row, viewer) }), reais));
  await attachConnections(env.DB, rows, posts, ctx, (r) => r.community);
  await attachAnonAvatar(env.DB, posts);
  const podeFixar = Boolean(ctx && ctx.any && canModerate(ctx, community.slug));
  return json({
    comunidade: { ...community, href: communityHref(community.slug) },
    postagens: posts,
    pode_fixar: podeFixar,
  });
}
