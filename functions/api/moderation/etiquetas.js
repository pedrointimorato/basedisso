// MOR-36 — gestão de etiquetas.
// GET  /api/moderation/etiquetas         → escopos que este ADM gere (site: 'site' + todas as b/; ADM de b/: as próprias) e as etiquetas (inclui desativadas) com uso.
// POST /api/moderation/etiquetas         { escopo, nome, cor, descricao } → cria.
import { errorJson, isSameOrigin, json } from "../../_lib/shared.js";
import { canModerate } from "../../_lib/admins.js";
import { authzTags, canManageScope, modTag, rateTagDef } from "../../_lib/etiquetas-adm.js";
import { listCommunitiesDb } from "../../_lib/comunidades.js";
import { TAGS_MAX_SCOPE, cleanTagColor, cleanTagDesc, cleanTagName, slugifyTag } from "../../_lib/etiquetas.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const a = await authzTags(request, env);
  if (a.res) return a.res;
  const ctx = a.ctx;
  const comms = await listCommunitiesDb(env.DB);
  const escopos = [];
  if (ctx.site) escopos.push({ escopo: "site", nome: "site todo" });
  for (const c of comms) if (canModerate(ctx, c.slug)) escopos.push({ escopo: c.slug, nome: "b/" + c.slug });
  const scopes = escopos.map((e) => e.escopo);
  const { results } = await env.DB.prepare(
    `SELECT t.*, (SELECT COUNT(*) FROM item_tags it WHERE it.tag_id = t.id) AS usos
     FROM tags t WHERE t.scope IN (SELECT value FROM json_each(?)) ORDER BY (t.scope = 'site') DESC, t.scope, t.position, t.name`
  ).bind(JSON.stringify(scopes)).all();
  return json({ escopos, max_por_escopo: TAGS_MAX_SCOPE, etiquetas: (results || []).map(modTag) });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  const a = await authzTags(request, env);
  if (a.res) return a.res;
  const ctx = a.ctx;
  let data;
  try { data = await request.json(); } catch { return errorJson("Pedido inválido.", 400); }
  const scope = String(data?.escopo || "").toLowerCase();
  if (!scope || !canManageScope(ctx, scope)) return errorJson(scope === "site" ? "Só ADMs do site criam etiquetas do site." : "Você não modera esta b/.", 403);
  if (scope !== "site") {
    const ok = (await listCommunitiesDb(env.DB)).some((c) => c.slug === scope);
    if (!ok) return errorJson("Comunidade não encontrada.", 404);
  }
  const name = cleanTagName(data?.nome);
  if (name === false) return errorJson("Nome longo demais (máx. 24).", 400);
  if (!name) return errorJson("Dê um nome à etiqueta.", 400);
  const slug = slugifyTag(name);
  if (!slug) return errorJson("Use letras ou números no nome.", 400);
  const color = cleanTagColor(data?.cor);
  if (color == null) return errorJson("Cor inválida.", 400);
  const desc = cleanTagDesc(data?.descricao);
  if (desc === false) return errorJson("Descrição longa demais (máx. 120).", 400);
  const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM tags WHERE scope = ?").bind(scope).first();
  if (Number(n?.n || 0) >= TAGS_MAX_SCOPE) return errorJson(`Limite de ${TAGS_MAX_SCOPE} etiquetas neste escopo.`, 400);
  const dup = await env.DB.prepare("SELECT scope FROM tags WHERE slug = ? AND (scope = ? OR scope = 'site' OR ? = 'site')").bind(slug, scope, scope).first();
  if (dup) return errorJson(dup.scope === "site" && scope !== "site" ? "Já existe uma etiqueta do site com esse nome." : dup.scope === scope ? "Já existe uma etiqueta com esse nome aqui." : "Uma b/ já usa esse nome de etiqueta.", 409);
  const lim = await rateTagDef(env, ctx);
  if (lim) return lim;
  const pos = await env.DB.prepare("SELECT COALESCE(MAX(position), 0) + 10 AS p FROM tags WHERE scope = ?").bind(scope).first();
  const id = crypto.randomUUID();
  const iso = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO tags (id, scope, name, slug, color, description, created_by, active, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)"
  ).bind(id, scope, name, slug, color, desc || null, ctx.user ? ctx.user.id : "token", Number(pos?.p || 10), iso, iso).run();
  const row = await env.DB.prepare("SELECT *, 0 AS usos FROM tags WHERE id = ?").bind(id).first();
  return json({ ok: true, etiqueta: modTag(row) }, 201);
}
