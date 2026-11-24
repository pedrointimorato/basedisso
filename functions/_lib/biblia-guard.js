import { errorJson, isSameOrigin } from "./shared.js";
import { denyUnlessSite, getAdminContext } from "./admins.js";
import { ensureSeed } from "./biblia.js";

// Só ADMs do site, mesma origem, com D1. Retorna { ctx } ou { res }.
export async function guard(request, env) {
  if (!env.DB) return { res: errorJson("Serviço indisponível.", 503) };
  const ctx = await getAdminContext(request, env);
  const deny = denyUnlessSite(ctx);
  if (deny) return { res: errorJson(deny.erro, deny.status) };
  if (!isSameOrigin(request)) return { res: errorJson("Origem não permitida.", 403) };
  await ensureSeed(env.DB);
  return { ctx };
}

export async function body(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
