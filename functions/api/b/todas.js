// MOR-41: feed geral das b/ — GET /api/b/todas?sort=novos|melhores&etiqueta=slug
// Postagens de todas as b/ existentes, mais novas primeiro (ou melhores), com as mesmas regras e anexos do feed
// de cada b/ (votos, etiquetas, mídia, enquete, autor real de anônimos só para quem modera aquela b/).
// Cada postagem leva pode_moderar (ADM do site ou daquela b/) e o avatar da b/ de origem vai em "bases".
import { attachTags, publicTag } from "../../_lib/etiquetas.js";
import { attachVotes } from "../../_lib/votos.js";
import { errorJson, json } from "../../_lib/shared.js";
import { getSessionUser } from "../../_lib/auth.js";
import { canModerate, getAdminContext } from "../../_lib/admins.js";
import { attachConnections } from "../../_lib/conexoes.js";
import { attachAnonAvatar, isOwn, realAuthors, withRealAuthor } from "../../_lib/anonimo.js";
import { listCommunitiesDb, publicPost } from "../../_lib/comunidades.js";
import { listAllVisiblePosts, normalizeAllSort } from "../../_lib/posts.js";
import { attachMedia } from "../../_lib/midia.js";
import { communityAvatarMap } from "../../_lib/b-avatar.js";

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const sort = normalizeAllSort(url.searchParams.get("sort"));
  if (!env.DB) return json({ sort, todas: true, postagens: [], bases: {} });
  const tagRaw = String(url.searchParams.get("etiqueta") || "").toLowerCase().trim();
  let filtro = null;
  if (tagRaw) {
    if (!/^[a-z0-9-]{1,24}$/.test(tagRaw)) return errorJson("Etiqueta inválida.", 400);
    const t = await env.DB.prepare("SELECT id, scope, name, slug, color, description FROM tags WHERE slug = ? AND active = 1 ORDER BY (scope = 'site') DESC LIMIT 1").bind(tagRaw).first().catch(() => null);
    if (!t) return json({ sort, todas: true, postagens: [], bases: {}, etiqueta: { slug: tagRaw, nome: tagRaw, cor: "0", inexistente: true } });
    filtro = publicTag(t);
  }
  const catalog = await listCommunitiesDb(env.DB);
  const viewer = await getSessionUser(request, env);
  const ctx = viewer ? await getAdminContext(request, env) : null;
  const rows = await listAllVisiblePosts(env.DB, catalog.map((c) => c.slug), 100, sort, filtro ? filtro.slug : null);
  const reais = await realAuthors(env.DB, rows, ctx, (r) => r.community);
  const posts = rows.map((row) => {
    const pode = Boolean(ctx && ctx.any && canModerate(ctx, row.community));
    // Fixar é de cada b/: aqui não reordena nem mostra o selo "fixado".
    return withRealAuthor(publicPost(row, { proprio: isOwn(row, viewer), pode_moderar: pode, fixado: false }), reais);
  });
  await attachConnections(env.DB, rows, posts, ctx, (r) => r.community);
  await attachAnonAvatar(env.DB, posts);
  await attachVotes(env.DB, "post", posts, viewer);
  await attachTags(env.DB, "post", posts);
  await attachMedia(env.DB, "post", posts);
  const avatars = await communityAvatarMap(env.DB);
  const bases = {};
  for (const p of posts) if (!bases[p.community]) bases[p.community] = { avatar: avatars[p.community] || null };
  return json({ sort, todas: true, postagens: posts, bases, etiqueta: filtro }, 200, { "Cache-Control": "no-store" });
}
