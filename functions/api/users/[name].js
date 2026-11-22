import { CLAIMABLE_ADMIN, isClaimableAdminName, normalizeUsername, publicUser } from "../../_lib/auth.js";
import { errorJson, json } from "../../_lib/shared.js";
import { lookupMentions } from "../../_lib/mentions.js";

export async function onRequestGet(context) {
  const { env, params } = context;
  if (!env.DB) return errorJson("Serviço de contas indisponível.", 503);
  const parsed = normalizeUsername(params.name || "");
  if (!parsed) return errorJson("Nome inválido.", 400);

  const row = await env.DB.prepare(
    "SELECT id, username, username_lc, is_admin, is_primordial, primordial_n, created_at FROM users WHERE username_lc = ?"
  )
    .bind(parsed.username_lc)
    .first();

  if (!row) {
    if (isClaimableAdminName(parsed.username_lc)) {
      return json({
        reservado: true,
        usuario: { username: CLAIMABLE_ADMIN, is_admin: true, created_at: null },
        comentarios: [],
        mensagem:
          ">>Intimorato é o nome reservado do administrador. A conta ainda não foi reivindicada.",
      });
    }
    return errorJson("Usuário não encontrado.", 404);
  }

  const { results } = await env.DB.prepare(
    `SELECT c.id, c.page, c.parent_id, c.name, c.body, c.created_at
     FROM comments c
     WHERE c.user_id = ? AND c.hidden = 0
     ORDER BY c.created_at DESC
     LIMIT 100`
  )
    .bind(row.id)
    .all();

  const comentarios = [];
  for (const c of results || []) {
    const mencoes = await lookupMentions(env.DB, c.body);
    comentarios.push({
      id: c.id,
      page: c.page,
      parent_id: c.parent_id,
      name: c.name,
      body: c.body,
      created_at: c.created_at,
      usuario: publicUser(row),
      mencoes,
    });
  }

  return json({ reservado: false, usuario: publicUser(row), comentarios });
}
