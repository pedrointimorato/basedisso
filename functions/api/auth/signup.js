import {
  CLAIMABLE_ADMIN,
  PASSWORD_MAX,
  PASSWORD_MIN,
  createSession,
  hashPassword,
  isClaimableAdminName,
  isReservedUsername,
  normalizeEmail,
  normalizeUsername,
  userCookieHeader,
} from "../../_lib/auth.js";
import {
  countRate,
  errorJson,
  hashIp,
  isAdmin,
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
    return json({ ok: true, usuario: { username: "anônimo", is_admin: false } }, 201);
  }

  const parsed = normalizeUsername(data?.username);
  if (!parsed) {
    return errorJson("O nome deve ter 3 a 20 caracteres (letras, números ou _).", 400);
  }
  const password = String(data?.password ?? "");
  if (password.length < PASSWORD_MIN) {
    return errorJson(`A senha deve ter pelo menos ${PASSWORD_MIN} caracteres.`, 400);
  }
  if (password.length > PASSWORD_MAX) {
    return errorJson("Senha longa demais.", 400);
  }
  const email = normalizeEmail(data?.email);
  if (email === undefined) return errorJson("E-mail inválido.", 400);

  const ipHash = await hashIp(request, env);
  const hour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const n = await countRate(env.DB, ipHash, "signup", hour);
  if (n >= 5) {
    return errorJson("Muitas contas criadas deste endereço. Tente mais tarde.", 429);
  }

  let isAdminAccount = 0;
  if (isClaimableAdminName(parsed.username_lc)) {
    if (!(await isAdmin(request, env))) {
      return errorJson(
        "O nome >>Intimorato é reservado. Entre na moderação para reivindicá-lo.",
        403
      );
    }
    isAdminAccount = 1;
  } else if (isReservedUsername(parsed.username_lc)) {
    return errorJson("Este nome não está disponível.", 400);
  }

  const existing = await env.DB.prepare("SELECT id FROM users WHERE username_lc = ?")
    .bind(parsed.username_lc)
    .first();
  if (existing) return errorJson("Este nome já está em uso.", 409);

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const passwordHash = await hashPassword(password);
  try {
    await env.DB.prepare(
      `INSERT INTO users (id, username, username_lc, password_hash, email, is_admin, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, parsed.username, parsed.username_lc, passwordHash, email, isAdminAccount, createdAt)
      .run();
  } catch (e) {
    const msg = String(e && e.message || e);
    if (/unique/i.test(msg)) return errorJson("Este nome já está em uso.", 409);
    throw e;
  }
  await recordRate(env.DB, ipHash, "signup");
  const token = await createSession(env.DB, id);
  return json(
    {
      ok: true,
      usuario: {
        username: parsed.username,
        is_admin: Boolean(isAdminAccount),
        created_at: createdAt,
      },
    },
    201,
    { "Set-Cookie": userCookieHeader(request, token) }
  );
}
