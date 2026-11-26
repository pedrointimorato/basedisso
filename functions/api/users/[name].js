import { CLAIMABLE_ADMIN, getSessionUser, isClaimableAdminName, normalizeUsername, publicUser } from "../../_lib/auth.js";
import { communitiesModeratedBy, communityOfPage, getAdminContext, isSiteAdmin } from "../../_lib/admins.js";
import { ANON_PROFILE_ID, anonUsuario, attachAnonAvatar, foldName, isOwn, realAuthors, withRealAuthor } from "../../_lib/anonimo.js";
import { readAnonEditLog } from "../../_lib/perfil-alvo.js";
import { ASCII_MAX_COLS, ASCII_MAX_LINES, AVATAR_MAX_COLS, AVATAR_MAX_LINES, LAYERS_MAX, readAscii, readAvatar, readLayers } from "../../_lib/ascii.js";
import { errorJson, json } from "../../_lib/shared.js";
import { lookupMentions } from "../../_lib/mentions.js";

export async function onRequestGet(context) {
  const { env, params } = context;
  if (!env.DB) return errorJson("Serviço de contas indisponível.", 503);
  let rawName = String(params.name || "");
  try { rawName = decodeURIComponent(rawName); } catch { /* mantém */ }
  if (foldName(rawName) === "anonimo") return anonProfile(context);
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
     WHERE c.user_id = ? AND c.hidden = 0 AND c.author_deleted_at IS NULL
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

  const viewer = await getSessionUser(context.request, env);
  const ascii = await readAscii(env.DB, row.id);
  const avatar = await readAvatar(env.DB, row.id);
  const podeEditar = Boolean(viewer && viewer.id === row.id);
  let podeRemover = false;
  if (viewer && (ascii || avatar)) {
    try {
      podeRemover = await isSiteAdmin(env.DB, viewer);
    } catch {
      podeRemover = false;
    }
  }
  return json({
    reservado: false,
    usuario: { ...publicUser(row), avatar: avatar ? avatar.arte : null, avatar_cores: avatar ? avatar.cores : null },
    adm_de: await communitiesModeratedBy(env.DB, row),
    comentarios,
    ascii,
    avatar,
    avatar_limites: { linhas: AVATAR_MAX_LINES, colunas: AVATAR_MAX_COLS },
    ascii_limites: { linhas: ASCII_MAX_LINES, colunas: ASCII_MAX_COLS },
    pode_editar_ascii: podeEditar,
    pode_remover_ascii: podeRemover,
    ...(await layersFor(env.DB, podeEditar, row.id, ascii, avatar)),
  });
}

// Camadas só para quem edita (o editor precisa delas; o resto do site usa a arte composta).
async function layersFor(db, podeEditar, id, ascii, avatar) {
  if (!podeEditar) return {};
  return {
    camadas_max: LAYERS_MAX,
    ascii_camadas: ascii ? await readLayers(db, "profile_ascii", id) : null,
    avatar_camadas: avatar ? await readLayers(db, "profile_avatar", id) : null,
  };
}

// Perfil coletivo >>anônimo: tudo o que foi publicado como >>anônimo (logado com a caixinha, ou deslogado sem nome).
export const ANON_PAGE_SIZE = 30;
const ANON_NAMES_SQL = "(name IN ('anônimo','anonimo','Anônimo','Anonimo','ANÔNIMO','ANONIMO',''))";

async function anonProfile(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const pagina = Math.min(1000, Math.max(1, parseInt(url.searchParams.get("pagina") || "1", 10) || 1));
  const offset = (pagina - 1) * ANON_PAGE_SIZE;
  const { results } = await env.DB.prepare(
    `SELECT * FROM (
       SELECT 'c' AS tipo, id, page, parent_id, NULL AS community, NULL AS title, body, created_at, user_id, anon_by, anon_badge, name
       FROM comments
       WHERE user_id IS NULL AND hidden = 0 AND author_deleted_at IS NULL AND (anon_by IS NOT NULL OR ${ANON_NAMES_SQL})
       UNION ALL
       SELECT 'p' AS tipo, id, '/b/' || community || '/p/' || id AS page, NULL AS parent_id, community, title, body, created_at, user_id, anon_by, anon_badge, name
       FROM posts
       WHERE user_id IS NULL AND hidden = 0 AND author_deleted_at IS NULL AND (anon_by IS NOT NULL OR ${ANON_NAMES_SQL})
     ) ORDER BY created_at DESC LIMIT ? OFFSET ?`
  )
    .bind(ANON_PAGE_SIZE + 1, offset)
    .all();
  const rows = (results || []).slice(0, ANON_PAGE_SIZE);
  const mais = (results || []).length > ANON_PAGE_SIZE;
  const viewer = await getSessionUser(request, env);
  const ctx = viewer ? await getAdminContext(request, env) : null;
  const reais = await realAuthors(env.DB, rows, ctx, (r) => (r.tipo === "p" ? r.community : communityOfPage(r.page)));
  const contribuicoes = [];
  for (const r of rows) {
    const item = {
      id: r.id,
      tipo: r.tipo === "p" ? "postagem" : "comentario",
      page: r.page,
      parent_id: r.parent_id || null,
      community: r.tipo === "p" ? r.community : communityOfPage(r.page),
      title: r.tipo === "p" ? r.title : null,
      body: r.body || "",
      created_at: r.created_at,
      usuario: anonUsuario(r),
      mencoes: await lookupMentions(env.DB, r.body || ""),
      proprio: isOwn(r, viewer),
    };
    contribuicoes.push(withRealAuthor(item, reais));
  }
  await attachAnonAvatar(env.DB, contribuicoes);
  const ascii = await readAscii(env.DB, ANON_PROFILE_ID);
  const avatar = await readAvatar(env.DB, ANON_PROFILE_ID);
  const podeEditar = Boolean(ctx && ctx.site && viewer);
  let ultima = null;
  if (ctx && ctx.any) {
    const l = await readAnonEditLog(env.DB);
    if (l) ultima = { por: l.username || null, em: l.edited_at, o_que: l.what || null };
  }
  return json({
    reservado: false,
    anonimo: true,
    usuario: { ...anonUsuario({}), avatar: avatar ? avatar.arte : null, avatar_cores: avatar ? avatar.cores : null },
    ascii,
    avatar,
    avatar_limites: { linhas: AVATAR_MAX_LINES, colunas: AVATAR_MAX_COLS },
    ascii_limites: { linhas: ASCII_MAX_LINES, colunas: ASCII_MAX_COLS },
    pode_editar_ascii: podeEditar,
    pode_remover_ascii: false,
    ...(await layersFor(env.DB, podeEditar, ANON_PROFILE_ID, ascii, avatar)),
    perfil_alvo: podeEditar ? "anonimo" : null,
    ultima_edicao: ultima,
    comentarios: [],
    contribuicoes,
    pagina,
    mais,
    por_pagina: ANON_PAGE_SIZE,
  });
}
