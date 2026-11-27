// PUT /api/etiquetas/item  { tipo: "post"|"comment", id, etiquetas: [ids] }
// Autor (com conta; inclusive itens anônimos) troca as etiquetas que ele pôs; não remove as postas por ADM.
// ADM do escopo (site: tudo; b/: a própria b/) define o conjunto inteiro. Máximo 3 por item. Só etiquetas ativas do escopo.
import { countRate, errorJson, isSameOrigin, json, recordRate } from "../../_lib/shared.js";
import { canModerate, communityOfPage, getAdminContext } from "../../_lib/admins.js";
import { ownerId } from "../../_lib/anonimo.js";
import { TAGS_MAX_ITEM, TAG_EDIT_PER_MIN, TAG_TIPOS, insertTagStatements, tagsOf, validateTagIds } from "../../_lib/etiquetas.js";

const ID_RE = /^[0-9a-f-]{36}$/i;

export async function onRequestPut(context) {
  const { request, env } = context;
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  const ctx = await getAdminContext(request, env);
  const user = ctx.user;
  if (!user) return json({ erro: "Entre na sua conta para editar etiquetas.", entrar: true }, 401);
  let data;
  try { data = await request.json(); } catch { return errorJson("Pedido inválido.", 400); }
  const tipo = TAG_TIPOS[String(data?.tipo || "").toLowerCase()];
  const id = String(data?.id || "");
  if (!tipo || !ID_RE.test(id)) return errorJson("Item inválido.", 400);

  let row, slug;
  if (tipo === "post") {
    row = await env.DB.prepare("SELECT id, community, user_id, anon_by, hidden, author_deleted_at FROM posts WHERE id = ?").bind(id).first();
    slug = row ? row.community : null;
  } else {
    row = await env.DB.prepare("SELECT id, page, user_id, anon_by, hidden, author_deleted_at FROM comments WHERE id = ?").bind(id).first();
    slug = row ? communityOfPage(row.page) : null;
  }
  if (!row) return errorJson(tipo === "post" ? "Postagem não encontrada." : "Comentário não encontrado.", 404);
  const isOwner = ownerId(row) === user.id && !row.hidden && !row.author_deleted_at;
  const isAdm = Boolean(ctx.any && (slug ? canModerate(ctx, slug) : ctx.site));
  if (!isOwner && !isAdm) return errorJson("Só o autor ou um ADM desta comunidade pode mudar as etiquetas.", 403);
  if (!isAdm && (row.hidden || row.author_deleted_at)) return errorJson("Item indisponível.", 404);

  const key = "u:" + user.id;
  if ((await countRate(env.DB, key, "tag", new Date(Date.now() - 60000).toISOString())) >= TAG_EDIT_PER_MIN) return errorJson("Muitas mudanças seguidas. Espere um minuto.", 429);

  const { results: cur } = await env.DB.prepare(
    "SELECT it.tag_id, it.added_by FROM item_tags it JOIN tags t ON t.id = it.tag_id WHERE it.item_type = ? AND it.item_id = ? AND t.active = 1"
  ).bind(tipo, id).all();
  const current = new Map((cur || []).map((r) => [r.tag_id, r.added_by]));
  // Dono (mesmo sendo ADM) grava 'autor' — nunca o id, para não expor quem está por trás de um item anônimo.
  const addedBy = isOwner ? "autor" : user.id;
  let target;
  if (isAdm) {
    const v = await validateTagIds(env.DB, data?.etiquetas, slug, TAGS_MAX_ITEM);
    if (v.erro) return errorJson(v.erro, 400);
    target = new Set(v.ids);
  } else {
    const locked = [...current].filter(([, by]) => by && by !== "autor").map(([tid]) => tid);
    const v = await validateTagIds(env.DB, (Array.isArray(data?.etiquetas) ? data.etiquetas : []).filter((x) => !locked.includes(x)), slug, TAGS_MAX_ITEM - locked.length);
    if (v.erro) return errorJson(v.erro, 400);
    target = new Set([...locked, ...v.ids]);
  }
  const iso = new Date().toISOString();
  const stmts = [];
  for (const tid of current.keys()) if (!target.has(tid)) stmts.push(env.DB.prepare("DELETE FROM item_tags WHERE item_type = ? AND item_id = ? AND tag_id = ?").bind(tipo, id, tid));
  stmts.push(...insertTagStatements(env.DB, tipo, id, [...target].filter((tid) => !current.has(tid)), addedBy, iso));
  if (stmts.length) await env.DB.batch(stmts);
  await recordRate(env.DB, key, "tag");
  const map = await tagsOf(env.DB, tipo, [id]);
  return json({ ok: true, tipo, id, etiquetas: map[id] || [] });
}
