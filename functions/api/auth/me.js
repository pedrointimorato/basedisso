import { getSessionUser, publicUser } from "../../_lib/auth.js";
import { json } from "../../_lib/shared.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const row = await getSessionUser(request, env);
  return json({ usuario: publicUser(row) });
}
