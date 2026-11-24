import { errorJson, isSameOrigin, json } from "../../../_lib/shared.js";
import { canModerate, communityOfPage, getAdminContext } from "../../../_lib/admins.js";

async function authz(request, env) {
  const ctx = await getAdminContext(request, env);
  if (!ctx.loggedIn) return { res: errorJson("Não autorizado.", 401) };
  if (!ctx.any) return { res: errorJson("Apenas ADMs podem moderar.", 403) };
  return { ctx };
}

function validId(id) {
  return typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id);
}

export async function onRequestPatch(context) {
  const { request, env, params } = context;
  const a = await authz(request, env);
  if (a.res) return a.res;
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  if (!env.DB) return errorJson("Serviço de comentários indisponível.", 503);
  const id = params.id;
  if (!validId(id)) return errorJson("Identificador inválido.", 400);

  let data;
  try {
    data = await request.json();
  } catch {
    return errorJson("Pedido inválido.", 400);
  }
  if (typeof data?.hidden !== "boolean") return errorJson("Informe hidden: true ou false.", 400);

  const existing = await env.DB.prepare("SELECT id, page FROM comments WHERE id = ?").bind(id).first();
  if (!existing) return errorJson("Comentário não encontrado.", 404);
  if (!canModerate(a.ctx, communityOfPage(existing.page))) {
    return errorJson("Você não modera esta comunidade.", 403);
  }
  await env.DB.prepare("UPDATE comments SET hidden = ? WHERE id = ?")
    .bind(data.hidden ? 1 : 0, id)
    .run();
  return json({ ok: true, hidden: data.hidden });
}

export async function onRequestDelete(context) {
  const { request, env, params } = context;
  const a = await authz(request, env);
  if (a.res) return a.res;
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  if (!env.DB) return errorJson("Serviço de comentários indisponível.", 503);
  const id = params.id;
  if (!validId(id)) return errorJson("Identificador inválido.", 400);

  const existing = await env.DB.prepare("SELECT id, page FROM comments WHERE id = ?").bind(id).first();
  if (!existing) return errorJson("Comentário não encontrado.", 404);
  if (!canModerate(a.ctx, communityOfPage(existing.page))) {
    return errorJson("Você não modera esta comunidade.", 403);
  }
  const ids = [id];
  let frontier = [id];
  while (frontier.length) {
    const placeholders = frontier.map(() => "?").join(",");
    const { results } = await env.DB.prepare(
      `SELECT id FROM comments WHERE parent_id IN (${placeholders})`
    )
      .bind(...frontier)
      .all();
    const next = (results || []).map((r) => r.id).filter((x) => !ids.includes(x));
    ids.push(...next);
    frontier = next;
  }
  await env.DB.batch(ids.map((cid) => env.DB.prepare("DELETE FROM comments WHERE id = ?").bind(cid)));
  return json({ ok: true, apagado: true });
}
