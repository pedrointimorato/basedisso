import { destroySession, userCookieHeader } from "../../_lib/auth.js";
import { json } from "../../_lib/shared.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (env.DB) await destroySession(env.DB, request);
  return json({ ok: true }, 200, { "Set-Cookie": userCookieHeader(request, "", true) });
}
