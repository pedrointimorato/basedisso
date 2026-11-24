import { getSessionUser } from "../../_lib/auth.js";
import { errorJson, isSameOrigin, json } from "../../_lib/shared.js";
import { MSG_SO_PAGANTES, addMinutesIso, PRIMORDIAL_COOLDOWN_MINUTES, generatePrimordialCode, primordialCodeState, publicCode } from "../../_lib/convites.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  const user = await getSessionUser(request, env);
  if (!user) return errorJson("Entre na sua conta.", 401);
  if (Number(user.is_paid_primordial) !== 1) return errorJson(MSG_SO_PAGANTES, 403);
  const state = await primordialCodeState(env.DB, user);
  if (state.proximo) {
    return json(
      { erro: "Você já gerou um código nas últimas 72 horas. O próximo fica disponível em breve.", proximo_disponivel_em: state.proximo },
      429
    );
  }
  const out = await generatePrimordialCode(env.DB, user);
  if (out.cooldown) {
    const st = await primordialCodeState(env.DB, user);
    return json({ erro: "Você já gerou um código nas últimas 72 horas.", proximo_disponivel_em: st.proximo }, 429);
  }
  const code = publicCode(out.row);
  return json(
    { ok: true, codigo: code, proximo_disponivel_em: addMinutesIso(out.row.created_at, PRIMORDIAL_COOLDOWN_MINUTES) },
    201
  );
}
