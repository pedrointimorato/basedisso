import { errorJson, json } from "../../../../_lib/shared.js";
import { getTier, refreshContribution, tierView } from "../../../../_lib/caixas.js";

export async function onRequestGet(context) {
  const { env, params } = context;
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  let row = await env.DB.prepare("SELECT * FROM collective_contributions WHERE id = ?").bind(String(params.id || "")).first();
  if (!row) return errorJson("Contribuição não encontrada.", 404);
  if (row.status === "pending" || row.status === "expired") {
    const r = await refreshContribution(env, row);
    row = r.row || row;
  }
  const box = await env.DB.prepare("SELECT * FROM collective_boxes WHERE id = ?").bind(row.box_id).first();
  let code = null;
  if (box && box.code_id) {
    const c = await env.DB.prepare("SELECT code_upper, expires_at, revoked_at FROM invite_codes WHERE id = ?").bind(box.code_id).first();
    if (c && !c.revoked_at) code = { code: c.code_upper, expires_at: c.expires_at };
  }
  const tier = await getTier(env.DB, row.tier_id);
  return json({
    ok: true,
    status: row.status,
    amount_cents: Number(row.amount_cents),
    box_funded: Boolean(box && box.status === "funded"),
    generated_code: code,
    box: box ? { id: box.id, round_n: Number(box.round_n), status: box.status, goal_cents: Number(box.goal_cents), raised_cents: Number(box.raised_cents) } : null,
    caixa: tier ? await tierView(env.DB, tier) : null,
  });
}
