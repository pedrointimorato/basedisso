import {
  PASSWORD_MAX,
  createSession,
  normalizeUsername,
  publicUser,
  userCookieHeader,
  verifyPassword,
} from "../../_lib/auth.js";
import {
  countRate,
  errorJson,
  hashIp,
  isSameOrigin,
  json,
  recordRate,
} from "../../_lib/shared.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return errorJson("Serviço de contas indisponível.", 503);
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);

  let data;
  try {
    data = await request.json();
  } catch {
    return errorJson("Pedido inválido.", 400);
  }
  if (data && typeof data.website === "string" && data.website.trim() !== "") {
    return errorJson("Nome ou senha incorretos.", 401);
  }

  const parsed = normalizeUsername(data?.username);
  const password = String(data?.password ?? "");
  if (!parsed || !password || password.length > PASSWORD_MAX) {
    return errorJson("Nome ou senha incorretos.", 401);
  }

  const ipHash = await hashIp(request, env);
  // Reuse the same ceiling as moderation login (5 / 15 min), separate kind.
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const fails = await countRate(env.DB, ipHash, "user_login_fail", since);
  if (fails >= 5) {
    return errorJson("Muitas tentativas de entrada. Espere alguns minutos.", 429);
  }

  const row = await env.DB.prepare(
    "SELECT id, username, username_lc, password_hash, is_admin, created_at FROM users WHERE username_lc = ?"
  )
    .bind(parsed.username_lc)
    .first();
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    await recordRate(env.DB, ipHash, "user_login_fail");
    return errorJson("Nome ou senha incorretos.", 401);
  }

  await env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?")
    .bind(new Date().toISOString())
    .run();
  const token = await createSession(env.DB, row.id);
  return json(
    { ok: true, usuario: publicUser(row) },
    200,
    { "Set-Cookie": userCookieHeader(request, token) }
  );
}
