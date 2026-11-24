import { errorJson, json } from "../_lib/shared.js";
import { listCommunityAdmins, listMembers, listSiteAdmins } from "../_lib/admins.js";
import { communityHref, listCommunitiesDb } from "../_lib/comunidades.js";

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  const [site, byComm, members, comms] = await Promise.all([
    listSiteAdmins(env.DB),
    listCommunityAdmins(env.DB),
    listMembers(env.DB),
    listCommunitiesDb(env.DB),
  ]);
  return json({
    adms_base: site,
    adms_comunidades: comms.map((c) => ({
      slug: c.slug,
      name: c.name,
      href: communityHref(c.slug),
      adms: byComm[c.slug] || [],
    })),
    membros: members.membros,
    total_membros: members.total,
  });
}
