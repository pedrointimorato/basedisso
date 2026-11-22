import { errorJson, isSameOrigin } from "../../_lib/shared.js";
import { claimReservation, reservaCookieHeader } from "../../_lib/reservas.js";
import { userCookieHeader } from "../../_lib/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  let data;
  try {
    data = await request.json();
  } catch {
    return errorJson("Pedido inválido.", 400);
  }
  const result = await claimReservation(env, request, {
    password: data?.password,
    token: data?.token,
    reservationId: data?.rid || data?.id,
  });
  if (result.error) return errorJson(result.error, result.status || 400);

  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  headers.append("Set-Cookie", userCookieHeader(request, result.sessionToken));
  headers.append("Set-Cookie", reservaCookieHeader(request, "", true));
  return new Response(JSON.stringify({ ok: true, usuario: result.usuario }), { status: 201, headers });
}
