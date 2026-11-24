import { getSessionUser } from "../../../_lib/auth.js";
import { errorJson, isSameOrigin, json } from "../../../_lib/shared.js";
import { getCommunityDb } from "../../../_lib/comunidades.js";

async function state(db, slug, user) {
  const total = await db
    .prepare("SELECT COUNT(*) AS n FROM community_members WHERE community_slug = ?")
    .bind(slug)
    .first();
  let row = null;
  if (user) {
    row = await db
      .prepare("SELECT joined_at FROM community_members WHERE community_slug = ? AND user_id = ?")
      .bind(slug, user.id)
      .first();
  }
  return {
    slug,
    logado: Boolean(user),
    membro: Boolean(row),
    joined_at: row ? row.joined_at : null,
    total_membros: Number(total?.n || 0),
  };
}

async function prep(context, needLogin) {
  const { request, env, params } = context;
  if (!env.DB) return { res: errorJson("Serviço indisponível.", 503) };
  const community = await getCommunityDb(env.DB, params.slug);
  if (!community) return { res: errorJson("Comunidade não encontrada.", 404) };
  if (needLogin && !isSameOrigin(request)) return { res: errorJson("Origem não permitida.", 403) };
  const user = await getSessionUser(request, env);
  if (needLogin && !user) {
    return { res: json({ erro: `Entre na sua conta para se unir a b/${community.slug}.`, logado: false }, 401) };
  }
  return { db: env.DB, slug: community.slug, user };
}

export async function onRequestGet(context) {
  const p = await prep(context, false);
  if (p.res) return p.res;
  return json(await state(p.db, p.slug, p.user));
}

export async function onRequestPost(context) {
  const p = await prep(context, true);
  if (p.res) return p.res;
  await p.db
    .prepare("INSERT OR IGNORE INTO community_members (community_slug, user_id, joined_at) VALUES (?, ?, ?)")
    .bind(p.slug, p.user.id, new Date().toISOString())
    .run();
  return json({ ok: true, ...(await state(p.db, p.slug, p.user)) });
}

export async function onRequestDelete(context) {
  const p = await prep(context, true);
  if (p.res) return p.res;
  await p.db
    .prepare("DELETE FROM community_members WHERE community_slug = ? AND user_id = ?")
    .bind(p.slug, p.user.id)
    .run();
  return json({ ok: true, ...(await state(p.db, p.slug, p.user)) });
}
