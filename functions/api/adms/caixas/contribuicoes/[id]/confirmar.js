import { errorJson, isSameOrigin, json } from "../../../../../_lib/shared.js";
import { denyUnlessSite, getAdminContext } from "../../../../../_lib/admins.js";
import { confirmBoxContribution } from "../../../../../_lib/caixas.js";
import { publicCode } from "../../../../../_lib/convites.js";

export async function onRequestPost(context) {
  const { request, env, params } = context;
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  const ctx = await getAdminContext(request, env);
  const deny = denyUnlessSite(ctx);
  if (deny) return errorJson(deny.erro, deny.status);
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  const id = String(params.id || "");
  const out = await confirmBoxContribution(env.DB, id, { manualBy: ctx.user ? ctx.user.username : "token" });
  if (!out.ok) return errorJson("Contribuição não encontrada.", 404);
  return json({
    ok: true,
    idempotent: Boolean(out.idempotent),
    box: out.box || null,
    funded: out.funded ? { box_id: out.funded.box.id, surplus_cents: out.funded.surplus, codigo: publicCode(out.funded.code) } : null,
  });
}
