import { getSessionUser } from "../../_lib/auth.js";
import { errorJson, isSameOrigin, json } from "../../_lib/shared.js";
import { cleanAsciiArt, cleanFrame, readAscii } from "../../_lib/ascii.js";

async function owner(request, env) {
  if (!env.DB) return { res: errorJson("Serviço indisponível.", 503) };
  if (!isSameOrigin(request)) return { res: errorJson("Origem não permitida.", 403) };
  const user = await getSessionUser(request, env);
  if (!user) return { res: errorJson("Entre na sua conta para editar o perfil.", 401) };
  return { user };
}

// PUT /api/perfil/ascii { arte, moldura: 'simples' | 'nenhuma' } — só a própria conta.
export async function onRequestPut(context) {
  const { request, env } = context;
  const o = await owner(request, env);
  if (o.res) return o.res;
  let data;
  try {
    data = await request.json();
  } catch {
    return errorJson("Pedido inválido.", 400);
  }
  if (!data || typeof data.arte !== "string") return errorJson("Envie a arte como texto.", 400);
  const moldura = cleanFrame(data.moldura);
  if (!moldura) return errorJson("Moldura inválida.", 400);
  const c = cleanAsciiArt(data.arte);
  if (c.erro) return errorJson(c.erro, 400);
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO profile_ascii (user_id, art, frame, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET art = excluded.art, frame = excluded.frame, updated_at = excluded.updated_at`
  )
    .bind(o.user.id, c.arte, moldura, now, now)
    .run();
  return json({ ok: true, ascii: await readAscii(env.DB, o.user.id) });
}

// DELETE /api/perfil/ascii — remove a própria arte.
export async function onRequestDelete(context) {
  const { request, env } = context;
  const o = await owner(request, env);
  if (o.res) return o.res;
  await env.DB.prepare("DELETE FROM profile_ascii WHERE user_id = ?").bind(o.user.id).run();
  return json({ ok: true, ascii: null });
}
