import { errorJson, isSameOrigin, json } from "../../_lib/shared.js";
import { canModerate, communityOfPage, getAdminContext } from "../../_lib/admins.js";
import { BAN_DURATIONS, BAN_REASON_MAX, banMessage, connLabel, isLoggedOutRow } from "../../_lib/conexoes.js";

const UUID = /^[0-9a-f-]{36}$/i;

async function authz(request, env) {
  const ctx = await getAdminContext(request, env);
  if (!ctx.loggedIn) return { res: errorJson("Não autorizado.", 401) };
  if (!ctx.any) return { res: errorJson("Apenas ADMs podem moderar.", 403) };
  if (!env.DB) return { res: errorJson("Serviço indisponível.", 503) };
  return { ctx };
}

// GET /api/moderation/conexoes — bans ativos que este ADM pode ver (site: todos; b/: só os da própria b/).
export async function onRequestGet(context) {
  const { request, env } = context;
  const a = await authz(request, env);
  if (a.res) return a.res;
  const ctx = a.ctx;
  const now = new Date().toISOString();
  let sql = `SELECT b.id, b.ip_hash, b.scope, b.reason, b.created_at, b.expires_at, u.username AS por
             FROM connection_bans b LEFT JOIN users u ON u.id = b.created_by
             WHERE (b.expires_at IS NULL OR b.expires_at > ?)`;
  const binds = [now];
  if (!ctx.site) {
    if (!ctx.communities.length) return json({ conexoes: [] });
    sql += ` AND b.scope IN (${ctx.communities.map(() => "?").join(",")})`;
    binds.push(...ctx.communities);
  }
  sql += " ORDER BY b.created_at DESC LIMIT 300";
  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  const conexoes = [];
  for (const r of results || []) {
    conexoes.push({
      id: r.id,
      escopo: r.scope,
      rotulo: await connLabel(r.ip_hash, r.scope),
      rotulo_site: ctx.site && r.scope !== "site" ? await connLabel(r.ip_hash, "site") : null,
      por: r.por || null,
      motivo: r.reason || null,
      criado_em: r.created_at,
      expira_em: r.expires_at,
      mensagem: banMessage(r),
    });
  }
  return json({ conexoes, pode_site: Boolean(ctx.site) });
}

// POST /api/moderation/conexoes { tipo: 'postagem'|'comentario', id, escopo: 'site'|'b', duracao, motivo, ocultar }
// O ADM aponta um item sem conta; o servidor pega o hash do item (o cliente nunca vê nem envia o hash).
export async function onRequestPost(context) {
  const { request, env } = context;
  const a = await authz(request, env);
  if (a.res) return a.res;
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  const ctx = a.ctx;
  let data;
  try {
    data = await request.json();
  } catch {
    return errorJson("Pedido inválido.", 400);
  }
  const tipo = data?.tipo === "postagem" ? "postagem" : data?.tipo === "comentario" ? "comentario" : null;
  if (!tipo || !UUID.test(String(data?.id || ""))) return errorJson("Item inválido.", 400);
  const row = tipo === "postagem"
    ? await env.DB.prepare("SELECT id, community, user_id, anon_by, ip_hash FROM posts WHERE id = ?").bind(data.id).first()
    : await env.DB.prepare("SELECT id, page, user_id, anon_by, ip_hash FROM comments WHERE id = ?").bind(data.id).first();
  if (!row) return errorJson("Item não encontrado.", 404);
  const slug = tipo === "postagem" ? row.community : communityOfPage(row.page);
  // Primeiro o escopo: quem não modera o item não descobre nada sobre ele.
  if (!ctx.site && !(slug && canModerate(ctx, slug))) return errorJson("Você não modera esta b/.", 403);
  if (!isLoggedOutRow(row)) return errorJson("Só dá para banir a conexão de itens publicados sem conta.", 400);
  const escopo = data?.escopo === "site" ? "site" : "b";
  let scope;
  if (escopo === "site") {
    if (!ctx.site) return errorJson("Só ADMs do site banem no site todo.", 403);
    scope = "site";
  } else {
    if (!slug) return errorJson("Este item não está numa b/; use o escopo do site.", 400);
    if (!canModerate(ctx, slug)) return errorJson("Você não modera esta b/.", 403);
    scope = slug;
  }
  const dur = Object.prototype.hasOwnProperty.call(BAN_DURATIONS, data?.duracao) ? data.duracao : "24h";
  const now = new Date();
  const expires = BAN_DURATIONS[dur] == null ? null : new Date(now.getTime() + BAN_DURATIONS[dur]).toISOString();
  const motivo = String(data?.motivo ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, BAN_REASON_MAX) || null;
  const by = ctx.user ? ctx.user.id : null;
  // Um ban ativo por conexão+escopo: substitui o anterior.
  await env.DB.prepare("DELETE FROM connection_bans WHERE ip_hash = ? AND scope = ?").bind(row.ip_hash, scope).run();
  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO connection_bans (id, ip_hash, scope, reason, created_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(id, row.ip_hash, scope, motivo, by, now.toISOString(), expires).run();
  let ocultados = { postagens: 0, comentarios: 0 };
  if (data?.ocultar === true) {
    // Oculta (reversível) só itens sem conta dessa conexão, dentro do escopo. Itens de contas nunca são tocados.
    if (scope === "site") {
      const p = await env.DB.prepare("UPDATE posts SET hidden = 1 WHERE ip_hash = ? AND user_id IS NULL AND anon_by IS NULL AND hidden = 0").bind(row.ip_hash).run();
      const c = await env.DB.prepare("UPDATE comments SET hidden = 1 WHERE ip_hash = ? AND user_id IS NULL AND anon_by IS NULL AND hidden = 0").bind(row.ip_hash).run();
      ocultados = { postagens: p.meta?.changes || 0, comentarios: c.meta?.changes || 0 };
    } else {
      const p = await env.DB.prepare("UPDATE posts SET hidden = 1 WHERE ip_hash = ? AND user_id IS NULL AND anon_by IS NULL AND hidden = 0 AND community = ?").bind(row.ip_hash, scope).run();
      const prefix = `/b/${scope}/p/`;
      const c = await env.DB.prepare(
        "UPDATE comments SET hidden = 1 WHERE ip_hash = ? AND user_id IS NULL AND anon_by IS NULL AND hidden = 0 AND (substr(page, 1, ?) = ? OR (? = 'adm' AND page = '/b/adm'))"
      ).bind(row.ip_hash, prefix.length, prefix, scope).run();
      ocultados = { postagens: p.meta?.changes || 0, comentarios: c.meta?.changes || 0 };
    }
  }
  return json({ ok: true, id, escopo: scope, rotulo: await connLabel(row.ip_hash, scope), expira_em: expires, ocultados }, 201);
}
