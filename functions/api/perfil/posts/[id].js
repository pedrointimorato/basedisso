// MOR-43: DELETE /api/perfil/posts/:id — autor exclui a própria; ADM do site também pode (oculta ou exclui).
// ?ocultar=1 no DELETE, ou corpo { ocultar: true }: ADM oculta (hidden=1) em vez de excluir.
import { errorJson, isSameOrigin, json } from "../../../_lib/shared.js";
import { UUID_RE } from "../../../_lib/comunidades.js";
import { getSessionUser } from "../../../_lib/auth.js";
import { getAdminContext } from "../../../_lib/admins.js";
import { getProfilePost } from "../../../_lib/perfil-posts.js";
import { sweepMedia } from "../../../_lib/midia.js";

export async function onRequestDelete(context) {
  const { request, env, params } = context;
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  const user = await getSessionUser(request, env);
  if (!user) return errorJson("Entre na sua conta para excluir.", 401);
  const id = params.id || "";
  if (!UUID_RE.test(id)) return errorJson("Identificador inválido.", 400);
  const row = await getProfilePost(env.DB, id);
  if (!row || row.author_deleted_at) return errorJson("Postagem não encontrada.", 404);
  const ctx = await getAdminContext(request, env);
  const proprio = row.user_id === user.id;
  const adm = Boolean(ctx && ctx.site);
  if (!proprio && !adm) return errorJson("Só o autor ou um ADM do site pode excluir esta postagem.", 403);

  let ocultar = false;
  try {
    const u = new URL(request.url);
    if (u.searchParams.get("ocultar") === "1") ocultar = true;
  } catch { /* ok */ }
  if (ocultar && !adm) return errorJson("Só um ADM do site pode ocultar.", 403);
  if (ocultar) {
    await env.DB.prepare("UPDATE profile_posts SET hidden = 1 WHERE id = ?").bind(id).run();
    return json({ ok: true, modo: "ocultar" });
  }
  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE profile_posts SET author_deleted_at = ? WHERE id = ? AND author_deleted_at IS NULL").bind(now, id).run();
  context.waitUntil(sweepMedia(env));
  return json({ ok: true, modo: "excluir" });
}
