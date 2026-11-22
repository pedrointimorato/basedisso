import { cookieHeader, json } from "../../_lib/shared.js";

export async function onRequestPost() {
  return json({ ok: true }, 200, { "Set-Cookie": cookieHeader("", true) });
}
