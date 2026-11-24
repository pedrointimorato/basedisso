import { errorJson, isSameOrigin, json } from "../../../_lib/shared.js";
import { canModerate, getAdminContext } from "../../../_lib/admins.js";
import { cleanCardInput, communityCard, getCommunityDb } from "../../../_lib/comunidades.js";

export async function onRequestGet(context) {
  const { env, params } = context;
  const community = await getCommunityDb(env.DB, params.slug);
  if (!community) return errorJson("Comunidade não encontrada.", 404);
  return json(communityCard(community));
}

export async function onRequestPut(context) {
  const { request, env, params } = context;
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  const community = await getCommunityDb(env.DB, params.slug);
  if (!community) return errorJson("Comunidade não encontrada.", 404);
  const ctx = await getAdminContext(request, env);
  if (!ctx.loggedIn) return errorJson("Entre na sua conta de ADM.", 401);
  if (!canModerate(ctx, community.slug)) {
    return errorJson(`Apenas ADMs do site ou de b/${community.slug} podem editar este cartão.`, 403);
  }
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  let data;
  try {
    data = await request.json();
  } catch {
    return errorJson("Pedido inválido.", 400);
  }
  const c = cleanCardInput(data);
  if (c.erro) return errorJson(c.erro, 400);
  if (c.title.length < 2) return errorJson("O título precisa ter ao menos 2 caracteres.", 400);
  const exists = await env.DB.prepare("SELECT slug FROM communities WHERE slug = ?").bind(community.slug).first();
  if (exists) {
    await env.DB.prepare("UPDATE communities SET name = ?, subtitle = ?, sidebar_text = ? WHERE slug = ?")
      .bind(c.title, c.subtitle, c.body, community.slug)
      .run();
  } else {
    await env.DB.prepare(
      "INSERT INTO communities (slug, name, description, posting, created_at, subtitle, sidebar_text) VALUES (?, ?, ?, 'open', ?, ?, ?)"
    )
      .bind(community.slug, c.title, community.description || "", new Date().toISOString(), c.subtitle, c.body)
      .run();
  }
  const updated = await getCommunityDb(env.DB, community.slug);
  return json({ ok: true, ...communityCard(updated) });
}
