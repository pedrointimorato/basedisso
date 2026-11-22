import { errorJson, isAdmin, isSameOrigin, json } from "../../../_lib/shared.js";

function validId(id) {
  return typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id);
}

export async function onRequestPatch(context) {
  const { request, env, params } = context;
  if (!(await isAdmin(request, env))) return errorJson("Não autorizado.", 401);
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

  const existing = await env.DB.prepare("SELECT id FROM comments WHERE id = ?").bind(id).first();
  if (!existing) return errorJson("Comentário não encontrado.", 404);
  await env.DB.prepare("UPDATE comments SET hidden = ? WHERE id = ?")
    .bind(data.hidden ? 1 : 0, id)
    .run();
  return json({ ok: true, hidden: data.hidden });
}

export async function onRequestDelete(context) {
  const { request, env, params } = context;
  if (!(await isAdmin(request, env))) return errorJson("Não autorizado.", 401);
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  if (!env.DB) return errorJson("Serviço de comentários indisponível.", 503);
  const id = params.id;
  if (!validId(id)) return errorJson("Identificador inválido.", 400);

  const existing = await env.DB.prepare("SELECT id FROM comments WHERE id = ?").bind(id).first();
  if (!existing) return errorJson("Comentário não encontrado.", 404);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM comments WHERE parent_id = ?").bind(id),
    env.DB.prepare("DELETE FROM comments WHERE id = ?").bind(id),
  ]);
  return json({ ok: true, apagado: true });
}
