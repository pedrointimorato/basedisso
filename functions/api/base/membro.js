import { getSessionUser } from "../../_lib/auth.js";
import { errorJson, isSameOrigin, json } from "../../_lib/shared.js";

async function state(db, user) {
  const total = await db.prepare("SELECT COUNT(*) AS n FROM base_members").first();
  let row = null;
  if (user) {
    row = await db.prepare("SELECT joined_at FROM base_members WHERE user_id = ?").bind(user.id).first();
  }
  return {
    logado: Boolean(user),
    membro: Boolean(row),
    joined_at: row ? row.joined_at : null,
    total: Number(total?.n || 0),
  };
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  const user = await getSessionUser(request, env);
  return json(await state(env.DB, user));
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  const user = await getSessionUser(request, env);
  if (!user) return json({ erro: "Entre na sua conta para se unir.", logado: false }, 401);
  await env.DB.prepare("INSERT OR IGNORE INTO base_members (user_id, joined_at) VALUES (?, ?)")
    .bind(user.id, new Date().toISOString())
    .run();
  return json({ ok: true, ...(await state(env.DB, user)) });
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  const user = await getSessionUser(request, env);
  if (!user) return json({ erro: "Entre na sua conta.", logado: false }, 401);
  await env.DB.prepare("DELETE FROM base_members WHERE user_id = ?").bind(user.id).run();
  return json({ ok: true, ...(await state(env.DB, user)) });
}
