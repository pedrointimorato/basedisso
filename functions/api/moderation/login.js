import {
  checkLoginRate,
  cookieHeader,
  errorJson,
  hashIp,
  isSameOrigin,
  json,
  recordRate,
  safeEqual,
  sessionCookieValue,
} from "../../_lib/shared.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.ADMIN_TOKEN) return errorJson("Moderação não configurada.", 503);
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);

  let data;
  try {
    data = await request.json();
  } catch {
    return errorJson("Pedido inválido.", 400);
  }

  const ipHash = await hashIp(request, env);
  if (env.DB) {
    const limited = await checkLoginRate(env.DB, ipHash);
    if (limited) return errorJson(limited, 429);
  }

  const password = String(data?.password ?? "").trim();
  if (!safeEqual(password, env.ADMIN_TOKEN)) {
    if (env.DB) await recordRate(env.DB, ipHash, "login_fail");
    return errorJson("Senha incorreta.", 401);
  }

  const value = await sessionCookieValue(env);
  return json({ ok: true }, 200, { "Set-Cookie": cookieHeader(value) });
}
