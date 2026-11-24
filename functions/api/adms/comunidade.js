import { errorJson, isSameOrigin, json } from "../../_lib/shared.js";
import { denyUnlessSite, findUserByRef, getAdminContext, listCommunityAdmins } from "../../_lib/admins.js";
import { getCommunityDb } from "../../_lib/comunidades.js";

async function prep(context) {
  const { request, env } = context;
  if (!env.DB) return { res: errorJson("Serviço indisponível.", 503) };
  const ctx = await getAdminContext(request, env);
  const deny = denyUnlessSite(ctx);
  if (deny) return { res: errorJson(deny.erro, deny.status) };
  if (!isSameOrigin(request)) return { res: errorJson("Origem não permitida.", 403) };
  let data = {};
  try {
    data = await request.json();
  } catch {
    data = {};
  }
  const community = await getCommunityDb(env.DB, String(data?.slug || "").replace(/^\/?b\//, ""));
  if (!community) return { res: errorJson("Comunidade não encontrada.", 404) };
  const user = await findUserByRef(env.DB, data?.username);
  if (!user) return { res: errorJson("Usuário não encontrado. Use >>Nome, @Nome ou Nome de uma conta existente.", 404) };
  return { ctx, user, env, community };
}

export async function onRequestPost(context) {
  const p = await prep(context);
  if (p.res) return p.res;
  const { ctx, user, env, community } = p;
  await env.DB.prepare(
    "INSERT OR IGNORE INTO community_admins (community_slug, user_id, added_by, created_at) VALUES (?, ?, ?, ?)"
  )
    .bind(community.slug, user.id, ctx.user ? ctx.user.id : "token", new Date().toISOString())
    .run();
  const all = await listCommunityAdmins(env.DB);
  return json({ ok: true, slug: community.slug, adms: all[community.slug] || [] });
}

export async function onRequestDelete(context) {
  const p = await prep(context);
  if (p.res) return p.res;
  const { user, env, community } = p;
  await env.DB.prepare("DELETE FROM community_admins WHERE community_slug = ? AND user_id = ?")
    .bind(community.slug, user.id)
    .run();
  const all = await listCommunityAdmins(env.DB);
  return json({ ok: true, slug: community.slug, adms: all[community.slug] || [] });
}
