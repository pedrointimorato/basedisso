import { errorJson, isSameOrigin, json } from "../../../_lib/shared.js";
import { canModerate, getAdminContext } from "../../../_lib/admins.js";
import { setPostPin } from "../../../_lib/fixar.js";

async function authz(request, env) {
  const ctx = await getAdminContext(request, env);
  if (!ctx.loggedIn) return { res: errorJson("Não autorizado.", 401) };
  if (!ctx.any) return { res: errorJson("Apenas ADMs podem moderar.", 403) };
  return { ctx };
}
import { UUID_RE, postPageKey } from "../../../_lib/comunidades.js";

async function deleteCommentsOnPage(db, page) {
  const { results } = await db
    .prepare("SELECT id, parent_id FROM comments WHERE page = ?")
    .bind(page)
    .all();
  const rows = results || [];
  if (!rows.length) return;
  const ids = new Set(rows.map((r) => r.id));
  // children first-ish: delete all on this page
  await db.batch(
    [...ids].map((cid) => db.prepare("DELETE FROM comments WHERE id = ?").bind(cid))
  );
}

export async function onRequestPatch(context) {
  const { request, env, params } = context;
  const a = await authz(request, env);
  if (a.res) return a.res;
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  if (!env.DB) return errorJson("Serviço de postagens indisponível.", 503);
  const id = params.id;
  if (!UUID_RE.test(id)) return errorJson("Identificador inválido.", 400);
  let data;
  try {
    data = await request.json();
  } catch {
    return errorJson("Pedido inválido.", 400);
  }
  const wantsPin = typeof data?.fixado === "boolean";
  if (!wantsPin && typeof data?.hidden !== "boolean") return errorJson("Informe hidden ou fixado: true ou false.", 400);
  const existing = await env.DB.prepare(
    "SELECT id, community, hidden, author_deleted_at, pinned_at FROM posts WHERE id = ?"
  ).bind(id).first();
  if (!existing) return errorJson("Postagem não encontrada.", 404);
  if (!canModerate(a.ctx, existing.community)) return errorJson("Você não modera esta comunidade.", 403);
  if (wantsPin) {
    const r = await setPostPin(env.DB, a.ctx, existing, data.fixado);
    if (!r.ok) return errorJson(r.erro, r.status);
    return json({ ok: true, fixado: r.fixado });
  }
  // Ocultar também desafixa.
  await env.DB.prepare(
    data.hidden ? "UPDATE posts SET hidden = 1, pinned_at = NULL, pinned_by = NULL WHERE id = ?" : "UPDATE posts SET hidden = 0 WHERE id = ?"
  )
    .bind(id)
    .run();
  return json({ ok: true, hidden: data.hidden });
}

export async function onRequestDelete(context) {
  const { request, env, params } = context;
  const a = await authz(request, env);
  if (a.res) return a.res;
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  if (!env.DB) return errorJson("Serviço de postagens indisponível.", 503);
  const id = params.id;
  if (!UUID_RE.test(id)) return errorJson("Identificador inválido.", 400);
  const existing = await env.DB.prepare("SELECT id, community FROM posts WHERE id = ?")
    .bind(id)
    .first();
  if (!existing) return errorJson("Postagem não encontrada.", 404);
  if (!canModerate(a.ctx, existing.community)) return errorJson("Você não modera esta comunidade.", 403);
  await deleteCommentsOnPage(env.DB, postPageKey(existing.community, id));
  await env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();
  return json({ ok: true, apagado: true });
}
