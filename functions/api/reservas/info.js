import { json } from "../../_lib/shared.js";
import { HOLD_MS, PRICE_BRL, reservasAbertas } from "../../_lib/reservas.js";

export async function onRequestGet(context) {
  const { env } = context;
  return json({
    aberto: reservasAbertas(env),
    preco: PRICE_BRL,
    moeda: "BRL",
    hold_minutos: Math.round(HOLD_MS / 60000),
  });
}
