import { logAnonEdit, profileTarget } from "../../_lib/perfil-alvo.js";
import { errorJson, isSameOrigin, json } from "../../_lib/shared.js";
import { cleanColorMask, cleanAsciiArt, cleanFrame, readAscii } from "../../_lib/ascii.js";

async function owner(request, env) {
  return profileTarget(request, env);
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
  const cm = cleanColorMask(data.cores, c.arte);
  if (cm.erro) return errorJson(cm.erro, 400);
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO profile_ascii (user_id, art, colors, frame, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET art = excluded.art, colors = excluded.colors, frame = excluded.frame, updated_at = excluded.updated_at`
  )
    .bind(o.targetId, c.arte, cm.cores, moldura, now, now)
    .run();
  if (o.anon) await logAnonEdit(env.DB, o.user, "arte (salvou)");
  return json({ ok: true, ascii: await readAscii(env.DB, o.targetId) });
}

// DELETE /api/perfil/ascii — remove a própria arte.
export async function onRequestDelete(context) {
  const { request, env } = context;
  const o = await owner(request, env);
  if (o.res) return o.res;
  await env.DB.prepare("DELETE FROM profile_ascii WHERE user_id = ?").bind(o.targetId).run();
  if (o.anon) await logAnonEdit(env.DB, o.user, "arte (removeu)");
  return json({ ok: true, ascii: null });
}
