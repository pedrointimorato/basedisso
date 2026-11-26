// De quem é o perfil editado: a própria conta, ou (ADMs do site) o perfil coletivo >>anônimo (?perfil=anonimo).
import { getSessionUser } from "./auth.js";
import { isSiteAdmin } from "./admins.js";
import { errorJson, isSameOrigin } from "./shared.js";

export const ANON_PROFILE_ID = "anonimo"; // ids de conta são UUIDs, então não colide

export async function profileTarget(request, env) {
  if (!env.DB) return { res: errorJson("Serviço indisponível.", 503) };
  if (!isSameOrigin(request)) return { res: errorJson("Origem não permitida.", 403) };
  const user = await getSessionUser(request, env);
  if (!user) return { res: errorJson("Entre na sua conta para editar o perfil.", 401) };
  const alvo = new URL(request.url).searchParams.get("perfil");
  if (alvo === "anonimo") {
    if (!(await isSiteAdmin(env.DB, user))) return { res: errorJson("Só ADMs do site editam o perfil >>anônimo.", 403) };
    return { user, targetId: ANON_PROFILE_ID, anon: true };
  }
  if (alvo) return { res: errorJson("Perfil inválido.", 400) };
  return { user, targetId: user.id, anon: false };
}

export async function logAnonEdit(db, user, what) {
  await db
    .prepare(
      `INSERT INTO profile_edit_log (target_id, edited_by, edited_at, what) VALUES (?, ?, ?, ?)
       ON CONFLICT(target_id) DO UPDATE SET edited_by = excluded.edited_by, edited_at = excluded.edited_at, what = excluded.what`
    )
    .bind(ANON_PROFILE_ID, user.id, new Date().toISOString(), what)
    .run();
}

export async function readAnonEditLog(db) {
  try {
    return await db
      .prepare("SELECT l.edited_at, l.what, u.username FROM profile_edit_log l LEFT JOIN users u ON u.id = l.edited_by WHERE l.target_id = ?")
      .bind(ANON_PROFILE_ID)
      .first();
  } catch {
    return null;
  }
}
