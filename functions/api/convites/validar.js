import { errorJson, json } from "../../_lib/shared.js";
import { validateCodePublic } from "../../_lib/convites.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  const url = new URL(request.url);
  const out = await validateCodePublic(env, request, url.searchParams.get("code") || url.searchParams.get("codigo"));
  return json(out.body, out.status);
}
