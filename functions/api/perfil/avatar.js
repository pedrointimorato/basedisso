import { logAnonEdit, profileTarget } from "../../_lib/perfil-alvo.js";
import { errorJson, isSameOrigin, json } from "../../_lib/shared.js";
import { cleanColorMask, AVATAR_LIMITS, cleanAsciiArt, readAvatar } from "../../_lib/ascii.js";

async function owner(request, env) {
  return profileTarget(request, env);
}

// PUT /api/perfil/avatar { arte } — avatar ASCII (até 8 linhas × 16 colunas), só a própria conta.
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
  if (!data || typeof data.arte !== "string") return errorJson("Envie o avatar como texto.", 400);
  const c = cleanAsciiArt(data.arte, AVATAR_LIMITS);
  if (c.erro) return errorJson(c.erro, 400);
  const cm = cleanColorMask(data.cores, c.arte);
  if (cm.erro) return errorJson(cm.erro, 400);
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO profile_avatar (user_id, art, colors, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET art = excluded.art, colors = excluded.colors, updated_at = excluded.updated_at`
  )
    .bind(o.targetId, c.arte, cm.cores, now, now)
    .run();
  if (o.anon) await logAnonEdit(env.DB, o.user, "avatar (salvou)");
  return json({ ok: true, avatar: await readAvatar(env.DB, o.targetId) });
}

// DELETE /api/perfil/avatar — remove o próprio avatar.
export async function onRequestDelete(context) {
  const { request, env } = context;
  const o = await owner(request, env);
  if (o.res) return o.res;
  await env.DB.prepare("DELETE FROM profile_avatar WHERE user_id = ?").bind(o.targetId).run();
  if (o.anon) await logAnonEdit(env.DB, o.user, "avatar (removeu)");
  return json({ ok: true, avatar: null });
}
