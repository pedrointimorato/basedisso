import { CLAIMABLE_ADMIN } from "../../_lib/auth.js";
import { isAdmin, json } from "../../_lib/shared.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  let claimed = false;
  if (env.DB) {
    const row = await env.DB.prepare("SELECT id FROM users WHERE username_lc = ?")
      .bind(CLAIMABLE_ADMIN.toLowerCase())
      .first();
    claimed = Boolean(row);
  }
  const canClaim = !claimed && (await isAdmin(request, env));
  return json({
    can_claim_intimorato: canClaim,
    intimorato_claimed: claimed,
    nome: CLAIMABLE_ADMIN,
  });
}
