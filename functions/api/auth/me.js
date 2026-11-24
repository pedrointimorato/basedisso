import { getSessionUser, publicUser } from "../../_lib/auth.js";
import { json } from "../../_lib/shared.js";
import { communitiesModeratedBy, isSiteAdmin } from "../../_lib/admins.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const row = await getSessionUser(request, env);
  const usuario = publicUser(row);
  let isSite = false;
  let comms = [];
  let membro = false;
  if (row && env.DB) {
    try {
      isSite = await isSiteAdmin(env.DB, row);
      comms = await communitiesModeratedBy(env.DB, row);
      membro = Boolean(
        await env.DB.prepare("SELECT 1 AS ok FROM base_members WHERE user_id = ?").bind(row.id).first()
      );
    } catch {
      /* tabelas ausentes em ambiente local */
    }
  }
  if (usuario) {
    usuario.is_site_admin = isSite;
    usuario.admin_communities = comms;
    usuario.is_member = membro;
    usuario.is_paid_primordial = Number(row.is_paid_primordial) === 1;
    usuario.can_generate_invites = usuario.is_paid_primordial || isSite;
  }
  return json({ usuario, is_site_admin: isSite, admin_communities: comms, is_member: membro });
}
