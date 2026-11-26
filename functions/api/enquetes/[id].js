// GET /api/enquetes/:postId — estado da enquete para quem está vendo.
import { errorJson, json } from "../../_lib/shared.js";
import { getSessionUser } from "../../_lib/auth.js";
import { getAdminContext } from "../../_lib/admins.js";
import { readPoll, visiblePost } from "../../_lib/enquete.js";

export async function onRequestGet(context) {
  const { request, env, params } = context;
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  const post = await visiblePost(env.DB, params.id);
  if (!post) return errorJson("Enquete não encontrada.", 404);
  const user = await getSessionUser(request, env);
  const ctx = user ? await getAdminContext(request, env) : null;
  const poll = await readPoll(env.DB, post, user, ctx);
  if (!poll) return errorJson("Esta postagem não tem enquete.", 404);
  return json({ enquete: poll });
}
