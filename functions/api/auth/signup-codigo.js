import { userCookieHeader } from "../../_lib/auth.js";
import { errorJson, isSameOrigin, json } from "../../_lib/shared.js";
import { signupWithCode } from "../../_lib/convites.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return errorJson("Serviço de contas indisponível.", 503);
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  let data;
  try {
    data = await request.json();
  } catch {
    return errorJson("Pedido inválido.", 400);
  }
  if (data && typeof data.website === "string" && data.website.trim() !== "") {
    return json({ ok: true, usuario: { username: "anônimo", is_admin: false } }, 201);
  }
  const out = await signupWithCode(env, request, data);
  if (out.error) return errorJson(out.error, out.status || 400);
  return json({ ok: true, usuario: out.usuario }, 201, { "Set-Cookie": userCookieHeader(request, out.sessionToken) });
}
