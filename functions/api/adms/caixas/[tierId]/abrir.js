import { errorJson, isSameOrigin, json } from "../../../../_lib/shared.js";
import { denyUnlessSite, getAdminContext } from "../../../../_lib/admins.js";
import { getTier, openBoxForTier, tierView } from "../../../../_lib/caixas.js";

export async function onRequestPost(context) {
  const { request, env, params } = context;
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  const ctx = await getAdminContext(request, env);
  const deny = denyUnlessSite(ctx);
  if (deny) return errorJson(deny.erro, deny.status);
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  const tier = await getTier(env.DB, params.tierId);
  if (!tier) return errorJson("Classe não encontrada.", 404);
  const open = await env.DB.prepare("SELECT id FROM collective_boxes WHERE tier_id = ? AND status = 'open'").bind(tier.id).first();
  if (open) return errorJson("Já existe uma caixa aberta nesta classe.", 409);
  const out = await openBoxForTier(env.DB, tier.id);
  if (out.error === "already_open") return errorJson("Já existe uma caixa aberta nesta classe.", 409);
  if (out.error) return errorJson("Não foi possível abrir a caixa.", 400);
  const updated = await getTier(env.DB, tier.id);
  return json({ ok: true, aberta: out.box, caixa: await tierView(env.DB, updated, { admin: true }) }, 201);
}
