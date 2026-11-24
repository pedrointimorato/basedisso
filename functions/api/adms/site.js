import { errorJson, isSameOrigin, json } from "../../_lib/shared.js";
import { FOUNDER_LC, denyUnlessSite, findUserByRef, getAdminContext, listSiteAdmins, syncIsAdmin } from "../../_lib/admins.js";

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
  const user = await findUserByRef(env.DB, data?.username);
  if (!user) return { res: errorJson("Usuário não encontrado. Use >>Nome, @Nome ou Nome de uma conta existente.", 404) };
  return { ctx, user, env };
}

export async function onRequestPost(context) {
  const p = await prep(context);
  if (p.res) return p.res;
  const { ctx, user, env } = p;
  await env.DB.prepare("INSERT OR IGNORE INTO site_admins (user_id, added_by, created_at) VALUES (?, ?, ?)")
    .bind(user.id, ctx.user ? ctx.user.id : "token", new Date().toISOString())
    .run();
  await syncIsAdmin(env.DB, user.id);
  return json({ ok: true, adms_site: await listSiteAdmins(env.DB) });
}

export async function onRequestDelete(context) {
  const p = await prep(context);
  if (p.res) return p.res;
  const { user, env } = p;
  if (user.username_lc === FOUNDER_LC) return errorJson(">>Intimorato é o fundador e não pode ser removido.", 400);
  await env.DB.prepare("DELETE FROM site_admins WHERE user_id = ?").bind(user.id).run();
  await syncIsAdmin(env.DB, user.id);
  return json({ ok: true, adms_site: await listSiteAdmins(env.DB) });
}
