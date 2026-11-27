// MOR-39: avatar ASCII de uma b/.
// GET    → { b, avatar: {arte, cores} | null, pode_editar, camadas? (só para quem pode editar) }
// PUT    { camadas: [{arte, cores, visivel}] } (ou { arte, cores }) → salva; só ADMs do site ou da própria b/.
// DELETE → remove (volta ao "b" laranja).
import { countRate, errorJson, isSameOrigin, json, recordRate } from "../../../_lib/shared.js";
import { canModerate, getAdminContext } from "../../../_lib/admins.js";
import { getCommunityDb } from "../../../_lib/comunidades.js";
import { cleanLayeredInput } from "../../../_lib/ascii.js";
import { B_AVATAR_LIMITS, B_AVATAR_PER_HOUR, readCommunityAvatar } from "../../../_lib/b-avatar.js";

async function guard(request, env, params, write) {
  if (!env.DB) return { res: errorJson("Serviço indisponível.", 503) };
  const community = await getCommunityDb(env.DB, String(params.slug || ""));
  if (!community) return { res: errorJson("Comunidade não encontrada.", 404) };
  const ctx = await getAdminContext(request, env);
  if (!write) return { community, ctx };
  if (!ctx.loggedIn) return { res: errorJson("Entre na sua conta de ADM.", 401) };
  if (!canModerate(ctx, community.slug)) return { res: errorJson(`Apenas ADMs do site ou de b/${community.slug} podem mudar o avatar.`, 403) };
  if (!isSameOrigin(request)) return { res: errorJson("Origem não permitida.", 403) };
  const key = ctx.user ? "u:" + ctx.user.id : "adm-token";
  if ((await countRate(env.DB, key, "bavatar", new Date(Date.now() - 3600000).toISOString())) >= B_AVATAR_PER_HOUR) {
    return { res: errorJson("Limite de mudanças de avatar por hora atingido. Tente mais tarde.", 429) };
  }
  return { community, ctx, key };
}

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const g = await guard(request, env, params, false);
  if (g.res) return g.res;
  const pode = Boolean(g.ctx.loggedIn && canModerate(g.ctx, g.community.slug));
  const a = await readCommunityAvatar(env.DB, g.community.slug, pode);
  const body = { b: g.community.slug, avatar: a ? { arte: a.arte, cores: a.cores, atualizado_em: a.atualizado_em } : null, pode_editar: pode, limites: { linhas: B_AVATAR_LIMITS.lines, colunas: B_AVATAR_LIMITS.cols } };
  if (pode) body.camadas = a ? a.camadas : null;
  return json(body, 200, { "Cache-Control": "no-store" });
}

export async function onRequestPut(context) {
  const { request, env, params } = context;
  const g = await guard(request, env, params, true);
  if (g.res) return g.res;
  if (Number(request.headers.get("Content-Length") || 0) > 64000) return errorJson("Pedido grande demais.", 413);
  let data;
  try { data = await request.json(); } catch { return errorJson("Pedido inválido.", 400); }
  if (!data || typeof data !== "object" || Array.isArray(data)) return errorJson("Pedido inválido.", 400);
  if (data.camadas === undefined && typeof data.arte !== "string") return errorJson("Envie o avatar como texto.", 400);
  const c = cleanLayeredInput(data, B_AVATAR_LIMITS);
  if (c.erro) return errorJson(c.erro, 400);
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO community_avatar (slug, art, colors, layers, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET art = excluded.art, colors = excluded.colors, layers = excluded.layers, updated_by = excluded.updated_by, updated_at = excluded.updated_at`
  ).bind(g.community.slug, c.arte, c.cores, c.camadas, g.ctx.user ? g.ctx.user.id : "token", now, now).run();
  await recordRate(env.DB, g.key, "bavatar");
  const a = await readCommunityAvatar(env.DB, g.community.slug, true);
  return json({ ok: true, b: g.community.slug, avatar: a ? { arte: a.arte, cores: a.cores, atualizado_em: a.atualizado_em } : null, camadas: a ? a.camadas : null });
}

export async function onRequestDelete(context) {
  const { request, env, params } = context;
  const g = await guard(request, env, params, true);
  if (g.res) return g.res;
  const r = await env.DB.prepare("DELETE FROM community_avatar WHERE slug = ?").bind(g.community.slug).run();
  if (r.meta && r.meta.changes) await recordRate(env.DB, g.key, "bavatar");
  return json({ ok: true, b: g.community.slug, avatar: null });
}
