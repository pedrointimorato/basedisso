import { errorJson, isSameOrigin, json } from "../../../../_lib/shared.js";
import { denyUnlessSite, getAdminContext } from "../../../../_lib/admins.js";
import { getTier, tierView } from "../../../../_lib/caixas.js";

export async function onRequestPost(context) {
  const { request, env, params } = context;
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  const ctx = await getAdminContext(request, env);
  const deny = denyUnlessSite(ctx);
  if (deny) return errorJson(deny.erro, deny.status);
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  const tier = await getTier(env.DB, params.tierId);
  if (!tier) return errorJson("Classe não encontrada.", 404);
  const box = await env.DB.prepare("UPDATE collective_boxes SET status = 'closed' WHERE tier_id = ? AND status = 'open' RETURNING *")
    .bind(tier.id)
    .first();
  if (!box) return errorJson("Não há caixa aberta nesta classe.", 409);
  const saldo = Number(box.raised_cents || 0);
  if (saldo > 0) {
    // O valor já arrecadado passa para a próxima rodada da mesma classe (nenhum centavo se perde).
    await env.DB.batch([
      env.DB.prepare("UPDATE collective_box_tiers SET carryover_cents = carryover_cents + ? WHERE id = ?").bind(saldo, tier.id),
      env.DB.prepare("UPDATE collective_boxes SET raised_cents = 0 WHERE id = ?").bind(box.id),
    ]);
  }
  const updated = await getTier(env.DB, tier.id);
  return json({ ok: true, fechada: { id: box.id, round_n: box.round_n, transferido_cents: saldo }, caixa: await tierView(env.DB, updated, { admin: true }) });
}
