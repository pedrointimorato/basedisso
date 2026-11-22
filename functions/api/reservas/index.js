import { countRate, errorJson, hashIp, isSameOrigin, json, recordRate } from "../../_lib/shared.js";
import { createReservation, reservaCookieHeader } from "../../_lib/reservas.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);

  let data;
  try {
    data = await request.json();
  } catch {
    return errorJson("Pedido inválido.", 400);
  }
  if (data && typeof data.website === "string" && data.website.trim() !== "") {
    return json({ ok: true }, 201);
  }

  const ipHash = await hashIp(request, env);
  if (env.DB) {
    const hour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const n = await countRate(env.DB, ipHash, "reserva", hour);
    if (n >= 8) return errorJson("Muitas reservas deste endereço. Tente mais tarde.", 429);
  }

  const result = await createReservation(env, request, {
    username: data?.username,
    email: data?.email,
  });
  if (result.error) return errorJson(result.error, result.status || 400);
  if (env.DB) await recordRate(env.DB, ipHash, "reserva");

  return json(
    { ok: true, reserva: result.reserva, checkout_url: result.checkout_url },
    201,
    { "Set-Cookie": reservaCookieHeader(request, result.cookie) }
  );
}
