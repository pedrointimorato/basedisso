import { errorJson, isSameOrigin, json } from "../../../_lib/shared.js";
import { denyUnlessSite, getAdminContext } from "../../../_lib/admins.js";
import { ADM_MAX_MINUTES, CODE_RE, insertInviteCode, listCodesForAdmin, publicCode } from "../../../_lib/convites.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  const ctx = await getAdminContext(request, env);
  const deny = denyUnlessSite(ctx);
  if (deny) return errorJson(deny.erro, deny.status);
  return json({ ok: true, codigos: await listCodesForAdmin(env.DB) });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  const ctx = await getAdminContext(request, env);
  const deny = denyUnlessSite(ctx);
  if (deny) return errorJson(deny.erro, deny.status);
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  let data = {};
  try {
    data = await request.json();
  } catch {
    return errorJson("Pedido inválido.", 400);
  }
  let minutes;
  if (data.duration_minutes != null && data.duration_minutes !== "") {
    minutes = Number(data.duration_minutes);
  } else {
    const v = Number(data.duration_value);
    const mult = { minutes: 1, minutos: 1, hours: 60, horas: 60, days: 1440, dias: 1440 }[String(data.duration_unit || "hours").toLowerCase()];
    if (!mult) return errorJson("Unidade de duração inválida.", 400);
    minutes = v * mult;
  }
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > ADM_MAX_MINUTES) {
    return errorJson("Duração inválida (de 1 minuto a 365 dias).", 400);
  }
  minutes = Math.round(minutes);
  let custom = String(data.code ?? data.codigo ?? "").trim();
  if (custom && !CODE_RE.test(custom)) return errorJson("O código tem 6 caracteres: letras e/ou números.", 400);
  let maxUses = null;
  if (data.max_uses != null && String(data.max_uses).trim() !== "") {
    maxUses = Number(data.max_uses);
    if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 100000) return errorJson("Limite de usos inválido.", 400);
  }
  const createdBy = ctx.user ? ctx.user.id : null;
  const row = await insertInviteCode(env.DB, {
    code: custom ? custom.toUpperCase() : null,
    kind: "adm",
    createdBy,
    durationMinutes: minutes,
    maxUses,
  });
  if (row && row.conflict) return errorJson("Já existe um código ativo igual a esse.", 409);
  return json({ ok: true, codigo: publicCode(row) }, 201);
}
