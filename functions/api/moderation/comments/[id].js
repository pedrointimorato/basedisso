import { sweepMedia } from "../../../_lib/midia.js";
import { errorJson, isSameOrigin, json } from "../../../_lib/shared.js";
import { canModerate, communityOfPage, getAdminContext } from "../../../_lib/admins.js";
import { setCommentPin } from "../../../_lib/fixar.js";

async function authz(request, env) {
  const ctx = await getAdminContext(request, env);
  if (!ctx.loggedIn) return { res: errorJson("Não autorizado.", 401) };
  if (!ctx.any) return { res: errorJson("Apenas ADMs podem moderar.", 403) };
  return { ctx };
}

function validId(id) {
  return typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id);
}

export async function onRequestPatch(context) {
  const { request, env, params } = context;
  const a = await authz(request, env);
  if (a.res) return a.res;
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  if (!env.DB) return errorJson("Serviço de comentários indisponível.", 503);
  const id = params.id;
  if (!validId(id)) return errorJson("Identificador inválido.", 400);

  let data;
  try {
    data = await request.json();
  } catch {
    return errorJson("Pedido inválido.", 400);
  }
  const wantsPin = typeof data?.fixado === "boolean";
  if (!wantsPin && typeof data?.hidden !== "boolean") return errorJson("Informe hidden ou fixado: true ou false.", 400);

  const existing = await env.DB.prepare(
    "SELECT id, page, parent_id, hidden, author_deleted_at, pinned_at FROM comments WHERE id = ?"
  ).bind(id).first();
  if (!existing) return errorJson("Comentário não encontrado.", 404);
  if (!canModerate(a.ctx, communityOfPage(existing.page))) {
    return errorJson(communityOfPage(existing.page) ? "Você não modera esta comunidade." : "Apenas ADMs do site podem moderar esta página.", 403);
  }
  if (wantsPin) {
    const r = await setCommentPin(env.DB, a.ctx, existing, data.fixado);
    if (!r.ok) return errorJson(r.erro, r.status);
    return json({ ok: true, fixado: r.fixado });
  }
  // Ocultar também desafixa.
  await env.DB.prepare(
    data.hidden ? "UPDATE comments SET hidden = 1, pinned_at = NULL, pinned_by = NULL WHERE id = ?" : "UPDATE comments SET hidden = 0 WHERE id = ?"
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
  if (!env.DB) return errorJson("Serviço de comentários indisponível.", 503);
  const id = params.id;
  if (!validId(id)) return errorJson("Identificador inválido.", 400);

  const existing = await env.DB.prepare("SELECT id, page FROM comments WHERE id = ?").bind(id).first();
  if (!existing) return errorJson("Comentário não encontrado.", 404);
  if (!canModerate(a.ctx, communityOfPage(existing.page))) {
    return errorJson("Você não modera esta comunidade.", 403);
  }
  const ids = [id];
  let frontier = [id];
  while (frontier.length) {
    const placeholders = frontier.map(() => "?").join(",");
    const { results } = await env.DB.prepare(
      `SELECT id FROM comments WHERE parent_id IN (${placeholders})`
    )
      .bind(...frontier)
      .all();
    const next = (results || []).map((r) => r.id).filter((x) => !ids.includes(x));
    ids.push(...next);
    frontier = next;
  }
  await env.DB.batch(ids.map((cid) => env.DB.prepare("DELETE FROM comments WHERE id = ?").bind(cid)));
  context.waitUntil(sweepMedia(env)); // MOR-38: arquivos de itens apagados/excluídos saem do R2
  return json({ ok: true, apagado: true });
}
