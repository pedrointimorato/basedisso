// MOR-35 — dados de votos/notas para ADMs.
// GET /api/moderation/votos?tipo=post|comment&id=…  → quem votou/deu nota neste item (exige poder moderar a b/ do item).
// GET /api/moderation/votos                          → recentes + estatística por conta, no escopo do ADM
//   (ADM do site: tudo; ADM de b/: só itens das próprias b/; comentários fora de /b/ só o ADM do site vê).
// Nunca expõe anon_by: só a conta de quem VOTOU, não o autor do item.
import { errorJson, json } from "../../_lib/shared.js";
import { canModerate, getAdminContext } from "../../_lib/admins.js";
import { COMMENT_SLUG_SQL, TIPOS, voteSummaries } from "../../_lib/votos.js";

const ID_RE = /^[0-9a-f-]{8,64}$/i;

const EVENTS_SQL = `WITH ev AS (
    SELECT 'voto' AS kind, item_type, item_id, user_id, value AS val, created_at, updated_at FROM votes
    UNION ALL
    SELECT 'nota' AS kind, item_type, item_id, user_id, stars AS val, created_at, updated_at FROM ratings
  ), it AS (
    SELECT ev.*,
      CASE WHEN ev.item_type = 'post' THEN p.community ELSE ${COMMENT_SLUG_SQL} END AS slug,
      CASE WHEN ev.item_type = 'post' THEN p.title ELSE substr(c.body, 1, 90) END AS titulo,
      CASE WHEN ev.item_type = 'post' THEN '/b/' || p.community || '/p/' || p.id ELSE c.page || '#c-' || c.id END AS href
    FROM ev
    LEFT JOIN posts p ON ev.item_type = 'post' AND p.id = ev.item_id
    LEFT JOIN comments c ON ev.item_type = 'comment' AND c.id = ev.item_id
  )`;

function scopeClause(ctx) {
  if (ctx.site) return { sql: "1 = 1", binds: [] };
  return { sql: "it.slug IN (SELECT value FROM json_each(?))", binds: [JSON.stringify(ctx.communities || [])] };
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const ctx = await getAdminContext(request, env);
  if (!ctx.loggedIn) return errorJson("Não autorizado.", 401);
  if (!ctx.any) return errorJson("Apenas ADMs veem dados de votos.", 403);
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  const url = new URL(request.url);
  const tipoRaw = url.searchParams.get("tipo");
  const id = url.searchParams.get("id") || "";

  if (tipoRaw || id) {
    const tipo = TIPOS[String(tipoRaw || "").toLowerCase()];
    if (!tipo || !ID_RE.test(id)) return errorJson("Item inválido.", 400);
    let slug = null;
    if (tipo === "post") {
      const r = await env.DB.prepare("SELECT community FROM posts WHERE id = ?").bind(id).first();
      if (!r) return errorJson("Postagem não encontrada.", 404);
      slug = r.community;
    } else {
      const r = await env.DB.prepare(`SELECT ${COMMENT_SLUG_SQL} AS slug FROM comments c WHERE c.id = ?`).bind(id).first();
      if (!r) return errorJson("Comentário não encontrado.", 404);
      slug = r.slug || null;
    }
    if (!(slug ? canModerate(ctx, slug) : ctx.site)) return errorJson("Fora da sua moderação.", 403);
    const { results } = await env.DB.prepare(
      `SELECT u.username, x.user_id, MAX(x.voto) AS voto, MAX(x.voto_em) AS voto_em, MAX(x.nota) AS nota, MAX(x.nota_em) AS nota_em
       FROM (
         SELECT user_id, value AS voto, updated_at AS voto_em, NULL AS nota, NULL AS nota_em FROM votes WHERE item_type = ?1 AND item_id = ?2
         UNION ALL
         SELECT user_id, NULL, NULL, stars, updated_at FROM ratings WHERE item_type = ?1 AND item_id = ?2
       ) x JOIN users u ON u.id = x.user_id
       GROUP BY x.user_id ORDER BY MAX(COALESCE(x.voto_em, ''), COALESCE(x.nota_em, '')) DESC LIMIT 500`
    ).bind(tipo, id).all();
    const resumo = (await voteSummaries(env.DB, tipo, [id], null))[id];
    return json({
      tipo, id, escopo: slug || "site", resumo,
      votantes: (results || []).map((r) => ({ conta: r.username, voto: r.voto == null ? 0 : Number(r.voto), voto_em: r.voto_em || null, nota: r.nota == null ? 0 : Number(r.nota), nota_em: r.nota_em || null })),
    });
  }

  const sc = scopeClause(ctx);
  const [rec, stats] = await env.DB.batch([
    env.DB.prepare(`${EVENTS_SQL}
      SELECT it.kind, it.item_type, it.item_id, it.val, it.created_at, it.updated_at, it.slug, it.titulo, it.href, u.username
      FROM it JOIN users u ON u.id = it.user_id WHERE ${sc.sql} ORDER BY it.updated_at DESC LIMIT 150`).bind(...sc.binds),
    env.DB.prepare(`${EVENTS_SQL}
      SELECT u.username,
        SUM(CASE WHEN it.kind = 'voto' AND it.val = 1 THEN 1 ELSE 0 END) AS up,
        SUM(CASE WHEN it.kind = 'voto' AND it.val = -1 THEN 1 ELSE 0 END) AS down,
        SUM(CASE WHEN it.kind = 'nota' THEN 1 ELSE 0 END) AS notas,
        AVG(CASE WHEN it.kind = 'nota' THEN it.val END) AS media,
        MAX(it.updated_at) AS ultimo
      FROM it JOIN users u ON u.id = it.user_id WHERE ${sc.sql}
      GROUP BY it.user_id ORDER BY ultimo DESC LIMIT 200`).bind(...sc.binds),
  ]);
  return json({
    escopo: ctx.site ? "site" : ctx.communities,
    recentes: (rec.results || []).map((r) => ({
      tipo: r.kind, item_tipo: r.item_type, item_id: r.item_id, valor: Number(r.val), em: r.updated_at, criado_em: r.created_at,
      b: r.slug || null, titulo: r.titulo || "", href: r.href || null, conta: r.username,
    })),
    contas: (stats.results || []).map((r) => ({
      conta: r.username, up: Number(r.up || 0), down: Number(r.down || 0), notas: Number(r.notas || 0),
      media: r.media == null ? null : Math.round(Number(r.media) * 10) / 10, ultimo: r.ultimo,
    })),
  });
}
