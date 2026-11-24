import { errorJson, json } from "../_lib/shared.js";
import { listCommunityAdmins, listCommunityMembers, listMembers, listSiteAdmins } from "../_lib/admins.js";
import { communityHref, listCommunitiesDb } from "../_lib/comunidades.js";

export async function onRequestGet(context) {
  const { env, request } = context;
  const focus = (new URL(request.url).searchParams.get("b") || "").trim().toLowerCase();
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  const [site, byComm, members, comms, byMembers] = await Promise.all([
    listSiteAdmins(env.DB),
    listCommunityAdmins(env.DB),
    listMembers(env.DB),
    listCommunitiesDb(env.DB),
    listCommunityMembers(env.DB),
  ]);
  const membrosComunidades = comms.map((c) => ({
    slug: c.slug,
    name: c.name,
    href: communityHref(c.slug),
    adms: byComm[c.slug] || [],
    membros: byMembers[c.slug] || [],
    total_membros: (byMembers[c.slug] || []).length,
  }));
  const foco = focus ? membrosComunidades.find((c) => c.slug === focus) || null : null;
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
    membros_comunidades: membrosComunidades,
    foco,
    foco_slug: focus || null,
  });
}
