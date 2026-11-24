import { errorJson, isSameOrigin, json } from "../../_lib/shared.js";
import { denyUnlessSite, getAdminContext } from "../../_lib/admins.js";
import { cleanCardInput, PANEL_DEFAULT } from "../../_lib/comunidades.js";

async function readCard(db) {
  let row = null;
  try {
    row = await db.prepare("SELECT title, subtitle, body, updated_at FROM site_cards WHERE key = 'b_panel'").first();
  } catch {
    row = null;
  }
  return {
    title: (row && row.title) || PANEL_DEFAULT.title,
    subtitle: row ? row.subtitle || "" : PANEL_DEFAULT.subtitle,
    body: row ? row.body || "" : PANEL_DEFAULT.body,
    updated_at: row ? row.updated_at : null,
  };
}

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.DB) return json({ ...PANEL_DEFAULT });
  return json(await readCard(env.DB));
}

export async function onRequestPut(context) {
  const { request, env } = context;
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  const ctx = await getAdminContext(request, env);
  const deny = denyUnlessSite(ctx);
  if (deny) return errorJson(deny.erro, deny.status);
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  let data;
  try {
    data = await request.json();
  } catch {
    return errorJson("Pedido inválido.", 400);
  }
  const c = cleanCardInput(data);
  if (c.erro) return errorJson(c.erro, 400);
  await env.DB.prepare(
    `INSERT INTO site_cards (key, title, subtitle, body, updated_at, updated_by) VALUES ('b_panel', ?, ?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET title = excluded.title, subtitle = excluded.subtitle, body = excluded.body,
       updated_at = excluded.updated_at, updated_by = excluded.updated_by`
  )
    .bind(c.title, c.subtitle, c.body, new Date().toISOString(), ctx.user ? ctx.user.id : "token")
    .run();
  return json({ ok: true, ...(await readCard(env.DB)) });
}
