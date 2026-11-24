import { errorJson, json } from "../../_lib/shared.js";
import { tiersPayload } from "../../_lib/caixas.js";

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  const caixas = await tiersPayload(env.DB, { admin: false });
  return json({ ok: true, agora: new Date().toISOString(), caixas });
}
