import { errorJson, json } from "../../../_lib/shared.js";
import { denyUnlessSite, getAdminContext } from "../../../_lib/admins.js";
import { recentContributions, tiersPayload } from "../../../_lib/caixas.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  const ctx = await getAdminContext(request, env);
  const deny = denyUnlessSite(ctx);
  if (deny) return errorJson(deny.erro, deny.status);
  const caixas = await tiersPayload(env.DB, { admin: true });
  return json({ ok: true, agora: new Date().toISOString(), caixas, contribuicoes: await recentContributions(env.DB) });
}
