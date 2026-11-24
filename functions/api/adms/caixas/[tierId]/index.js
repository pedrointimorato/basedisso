import { errorJson, isSameOrigin, json } from "../../../../_lib/shared.js";
import { denyUnlessSite, getAdminContext } from "../../../../_lib/admins.js";
import { getTier, tierView } from "../../../../_lib/caixas.js";

export async function onRequestPatch(context) {
  const { request, env, params } = context;
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  const ctx = await getAdminContext(request, env);
  const deny = denyUnlessSite(ctx);
  if (deny) return errorJson(deny.erro, deny.status);
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  const tier = await getTier(env.DB, params.tierId);
  if (!tier) return errorJson("Classe não encontrada.", 404);
  let data = {};
  try {
    data = await request.json();
  } catch {
    return errorJson("Pedido inválido.", 400);
  }
  const sets = [];
  const binds = [];
  const bool = (v) => (v === true || v === 1 || v === "1" || v === "true" ? 1 : 0);
  if (data.enabled != null) { sets.push("enabled = ?"); binds.push(bool(data.enabled)); }
  if (data.auto_reopen != null) { sets.push("auto_reopen = ?"); binds.push(bool(data.auto_reopen)); }
  const ints = { goal_cents: [100, 10000000], code_duration_minutes: [1, 525600], cooldown_minutes: [0, 525600] };
  for (const k of Object.keys(ints)) {
    if (data[k] == null || data[k] === "") continue;
    const v = Number(data[k]);
    if (!Number.isInteger(v) || v < ints[k][0] || v > ints[k][1]) return errorJson(`Valor inválido para ${k}.`, 400);
    sets.push(`${k} = ?`);
    binds.push(v);
  }
  if (!sets.length) return errorJson("Nada para alterar.", 400);
  await env.DB.prepare(`UPDATE collective_box_tiers SET ${sets.join(", ")} WHERE id = ?`).bind(...binds, tier.id).run();
  const updated = await getTier(env.DB, tier.id);
  return json({ ok: true, caixa: await tierView(env.DB, updated, { admin: true }) });
}
