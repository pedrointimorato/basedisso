// POST /api/enquetes/:postId/votar { opcao } — 1 voto por conta, sem troca.
import { errorJson, isSameOrigin, json } from "../../../_lib/shared.js";
import { getSessionUser } from "../../../_lib/auth.js";
import { getAdminContext } from "../../../_lib/admins.js";
import { readPoll, visiblePost, voteEligibility } from "../../../_lib/enquete.js";

export async function onRequestPost(context) {
  const { request, env, params } = context;
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  const user = await getSessionUser(request, env);
  if (!user) return errorJson("Entre na sua conta para votar.", 401);
  const post = await visiblePost(env.DB, params.id);
  if (!post) return errorJson("Enquete não encontrada.", 404);
  let data;
  try { data = await request.json(); } catch { return errorJson("Pedido inválido.", 400); }
  const optionId = String(data?.opcao || "");
  const poll = await env.DB.prepare("SELECT closes_at FROM polls WHERE post_id = ?").bind(post.id).first();
  if (!poll) return errorJson("Esta postagem não tem enquete.", 404);
  if (Date.parse(poll.closes_at) <= Date.now()) return errorJson("Enquete encerrada.", 409);
  const ctx = await getAdminContext(request, env);
  const elig = voteEligibility(user, ctx, post.community);
  if (!elig.ok) return errorJson(elig.texto, 403);
  const opt = await env.DB.prepare("SELECT id FROM poll_options WHERE id = ? AND post_id = ?").bind(optionId, post.id).first();
  if (!opt) return errorJson("Opção inválida.", 400);
  const r = await env.DB.prepare(
    "INSERT OR IGNORE INTO poll_votes (post_id, user_id, option_id, created_at) VALUES (?, ?, ?, ?)"
  ).bind(post.id, user.id, opt.id, new Date().toISOString()).run();
  if (!r.meta || !r.meta.changes) return errorJson("Você já votou nesta enquete. O voto não pode ser trocado.", 409);
  return json({ ok: true, enquete: await readPoll(env.DB, post, user, ctx) });
}
