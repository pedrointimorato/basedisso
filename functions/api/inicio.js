// MOR-43: feed da página inicial — literatura da comunidade, catálogo em grade das b/, postagens de perfil.
import { json } from "../_lib/shared.js";
import { listCommunitiesDb, publicPost } from "../_lib/comunidades.js";
import { listAllVisiblePosts } from "../_lib/posts.js";
import { attachMedia } from "../_lib/midia.js";
import { communityAvatarMap } from "../_lib/b-avatar.js";
import { readBiblia, BIBLIA_DEFAULT } from "../_lib/biblia.js";
import { listProfilePosts, publicProfilePost, excerptOf, PERFIL_FEED_MAX } from "../_lib/perfil-posts.js";
import { getSessionUser } from "../_lib/auth.js";
import { getAdminContext } from "../_lib/admins.js";

const B_GRID = 12;

function bCard(p, avatars) {
  const av = avatars[p.community] || null;
  return {
    id: p.id,
    community: p.community,
    title: p.title,
    excerpt: excerptOf(p.body),
    url: p.url,
    comment_count: Number(p.comment_count || 0),
    created_at: p.created_at,
    midia: p.midia || null,
    enquete: Boolean(p.enquete),
    avatar: av ? { arte: av.arte, cores: av.cores } : null,
  };
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const viewer = env.DB ? await getSessionUser(request, env) : null;
  const ctx = viewer ? await getAdminContext(request, env) : null;
  const siteAdm = Boolean(ctx && ctx.site);

  let literatura = [];
  try {
    const doc = env.DB ? await readBiblia(env.DB) : BIBLIA_DEFAULT;
    const m = (doc && doc.meta) || BIBLIA_DEFAULT.meta;
    literatura = [{
      id: "biblia-amarela",
      titulo: m.titulo_capa || m.titulo || "A Bíblia Amarela",
      subtitulo: m.subtitulo || "",
      href: "/l/biblia-amarela.html",
      estante: "/l/",
      atualizado_em: (m.editado && m.editado.em) || null,
    }];
  } catch {
    literatura = [{ id: "biblia-amarela", titulo: "A Bíblia Amarela", subtitulo: "", href: "/l/biblia-amarela.html", estante: "/l/", atualizado_em: null }];
  }

  let grade = [];
  if (env.DB) {
    const catalog = await listCommunitiesDb(env.DB);
    const rows = await listAllVisiblePosts(env.DB, catalog.map((c) => c.slug), B_GRID, "novos", null);
    const posts = rows.map((row) => publicPost(row));
    await attachMedia(env.DB, "post", posts);
    const avatars = await communityAvatarMap(env.DB);
    grade = posts.map((p) => bCard(p, avatars));
  }

  const prow = env.DB ? await listProfilePosts(env.DB, { limit: PERFIL_FEED_MAX }) : [];
  const perfil = prow.map((r) => publicProfilePost(r, {
    proprio: Boolean(viewer && viewer.id === r.user_id),
    pode_moderar: siteAdm,
  }));
  if (env.DB) await attachMedia(env.DB, "perfil", perfil);

  return json({
    literatura,
    grade_b: { postagens: grade },
    perfil,
  }, 200, { "Cache-Control": "no-store" });
}
