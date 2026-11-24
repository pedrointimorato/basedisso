import { getSessionUser } from "../../_lib/auth.js";
import { errorJson, json } from "../../_lib/shared.js";
import { isSiteAdmin } from "../../_lib/admins.js";
import {
  MSG_SO_PAGANTES,
  PRIMORDIAL_CODE_MINUTES,
  PRIMORDIAL_COOLDOWN_MINUTES,
  primordialCodeState,
  publicCode,
} from "../../_lib/convites.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  const user = await getSessionUser(request, env);
  if (!user) return errorJson("Entre na sua conta.", 401);
  const site = await isSiteAdmin(env.DB, user);
  const paid = Number(user.is_paid_primordial) === 1;
  const { rows, proximo, now } = await primordialCodeState(env.DB, user);
  const historico = rows.map((r) => publicCode(r, now));
  const ativo = historico.find((c) => c.kind === "primordial" && c.status === "ativo") || null;
  return json({
    ok: true,
    usuario: { username: user.username, is_primordial: Boolean(user.is_primordial), primordial_n: user.primordial_n, is_paid_primordial: paid },
    is_site_admin: site,
    pode_gerar_primordial: paid,
    can_generate_invites: paid || site,
    mensagem: paid || site ? null : MSG_SO_PAGANTES,
    duracao_minutos: PRIMORDIAL_CODE_MINUTES,
    espera_minutos: PRIMORDIAL_COOLDOWN_MINUTES,
    proximo_disponivel_em: paid ? proximo : null,
    ativo,
    historico,
  });
}
