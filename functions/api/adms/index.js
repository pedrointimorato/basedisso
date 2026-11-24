import { errorJson, json } from "../../_lib/shared.js";
import { getAdminContext, listCommunityAdmins, listSiteAdmins } from "../../_lib/admins.js";
import { communityHref, listCommunitiesDb } from "../../_lib/comunidades.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  const ctx = await getAdminContext(request, env);
  // Sem ADM: responde 200 sem dados (o painel usa isto para decidir se mostra o login).
  if (!ctx.loggedIn) return json({ autorizado: false, motivo: "login" });
  if (!ctx.any) return json({ autorizado: false, motivo: "sem_permissao" });
  const [site, byComm, comms] = await Promise.all([
    listSiteAdmins(env.DB),
    listCommunityAdmins(env.DB),
    listCommunitiesDb(env.DB),
  ]);
  return json({
    autorizado: true,
    voce: {
      username: ctx.user ? ctx.user.username : null,
      via_token: ctx.token && !ctx.user,
      is_site_admin: ctx.site,
      comunidades: ctx.site ? comms.map((c) => c.slug) : ctx.communities,
    },
    adms_site: site,
    adms_comunidades: byComm,
    comunidades: comms.map((c) => ({ slug: c.slug, name: c.name, href: communityHref(c.slug) })),
  });
}
