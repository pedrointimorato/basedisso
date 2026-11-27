// PATCH /api/moderation/etiquetas/<id>  { nome?, cor?, descricao?, ativa?, ordem? }
// Etiquetas não são apagadas: desative (some dos seletores e dos itens; volta se reativar).
import { errorJson, isSameOrigin, json } from "../../../_lib/shared.js";
import { cleanTagColor, cleanTagDesc, cleanTagName, slugifyTag } from "../../../_lib/etiquetas.js";
import { authzTags, canManageScope, modTag, rateTagDef } from "../../../_lib/etiquetas-adm.js";

export async function onRequestPatch(context) {
  const { request, env, params } = context;
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  const a = await authzTags(request, env);
  if (a.res) return a.res;
  const ctx = a.ctx;
  const id = String(params.id || "");
  const row = await env.DB.prepare("SELECT * FROM tags WHERE id = ?").bind(id).first();
  if (!row) return errorJson("Etiqueta não encontrada.", 404);
  if (!canManageScope(ctx, row.scope)) return errorJson(row.scope === "site" ? "Só ADMs do site mudam etiquetas do site." : "Você não modera esta b/.", 403);
  let data;
  try { data = await request.json(); } catch { return errorJson("Pedido inválido.", 400); }
  const set = {};
  if (data && "nome" in data) {
    const name = cleanTagName(data.nome);
    if (name === false) return errorJson("Nome longo demais (máx. 24).", 400);
    if (!name) return errorJson("Dê um nome à etiqueta.", 400);
    const slug = slugifyTag(name);
    if (!slug) return errorJson("Use letras ou números no nome.", 400);
    if (slug !== row.slug) {
      const dup = await env.DB.prepare("SELECT scope FROM tags WHERE slug = ? AND id <> ? AND (scope = ? OR scope = 'site' OR ? = 'site')").bind(slug, id, row.scope, row.scope).first();
      if (dup) return errorJson("Já existe uma etiqueta com esse nome.", 409);
    }
    set.name = name; set.slug = slug;
  }
  if (data && "cor" in data) { const c = cleanTagColor(data.cor); if (c == null) return errorJson("Cor inválida.", 400); set.color = c; }
  if (data && "descricao" in data) { const d = cleanTagDesc(data.descricao); if (d === false) return errorJson("Descrição longa demais (máx. 120).", 400); set.description = d || null; }
  if (data && "ativa" in data) set.active = data.ativa ? 1 : 0;
  if (data && "ordem" in data) { const o = Number(data.ordem); if (!Number.isInteger(o) || o < 0 || o > 100000) return errorJson("Ordem inválida.", 400); set.position = o; }
  const keys = Object.keys(set);
  if (!keys.length) return errorJson("Nada para mudar.", 400);
  const lim = await rateTagDef(env, ctx);
  if (lim) return lim;
  set.updated_at = new Date().toISOString();
  const ks = Object.keys(set);
  await env.DB.prepare(`UPDATE tags SET ${ks.map((k) => k + " = ?").join(", ")} WHERE id = ?`).bind(...ks.map((k) => set[k]), id).run();
  const out = await env.DB.prepare("SELECT t.*, (SELECT COUNT(*) FROM item_tags it WHERE it.tag_id = t.id) AS usos FROM tags t WHERE t.id = ?").bind(id).first();
  return json({ ok: true, etiqueta: modTag(out) });
}
