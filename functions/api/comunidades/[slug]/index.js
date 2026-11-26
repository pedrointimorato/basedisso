import { errorJson, json } from "../../../_lib/shared.js";
import { getCommunityDb, communityHref, publicPost } from "../../../_lib/comunidades.js";
import { normalizeSort, listVisiblePosts } from "../../../_lib/posts.js";
import { getSessionUser } from "../../../_lib/auth.js";
import { canModerate, getAdminContext } from "../../../_lib/admins.js";

export async function onRequestGet(context) {
  const { env, params, request } = context;
  const sort = normalizeSort(new URL(request.url).searchParams.get("sort"));
  const community = await getCommunityDb(env.DB, params.slug);
  if (!community) return errorJson("Comunidade não encontrada.", 404);
  const viewer = env.DB ? await getSessionUser(request, env) : null;
  const posts = env.DB
    ? (await listVisiblePosts(env.DB, community.slug, 100, sort)).map((row) =>
        publicPost(row, { proprio: Boolean(viewer && row.user_id && row.user_id === viewer.id) })
      )
    : [];
  let podeFixar = false;
  if (env.DB && request.headers.get("Cookie")) {
    const ctx = await getAdminContext(request, env);
    podeFixar = ctx.any && canModerate(ctx, community.slug);
  }
  return json({
    comunidade: { ...community, href: communityHref(community.slug) },
    postagens: posts,
    pode_fixar: podeFixar,
  });
}
