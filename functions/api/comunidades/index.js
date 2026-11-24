import { errorJson, isSameOrigin, json } from "../../_lib/shared.js";
import {
  communityHref,
  getCommunityDb,
  listCommunities,
  listCommunitiesDb,
  NEW_SLUG_RE,
  RESERVED_SLUGS,
  STATIC_B_DIRS,
} from "../../_lib/comunidades.js";
import { denyUnlessSite, getAdminContext, listCommunityAdmins } from "../../_lib/admins.js";
import { getSessionUser } from "../../_lib/auth.js";

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.DB) {
    return json({
      comunidades: listCommunities().map((c) => ({
        ...c,
        href: communityHref(c.slug),
        post_count: c.slug === "adm" ? 1 : 0,
        last_activity: null,
        adms: [],
      })),
    });
  }

  const catalog = await listCommunitiesDb(env.DB);
  const { results: postRows } = await env.DB.prepare(
    `SELECT community, COUNT(*) AS n, MAX(created_at) AS last_at
     FROM posts WHERE hidden = 0 GROUP BY community`
  ).all();
  const bySlug = {};
  for (const row of postRows || []) {
    bySlug[row.community] = { n: Number(row.n || 0), last_at: row.last_at || null };
  }

  const { results: commentRows } = await env.DB.prepare(
    `SELECT page, MAX(created_at) AS last_at
     FROM comments
     WHERE hidden = 0 AND (page = '/b/adm' OR page LIKE '/b/%/p/%')
     GROUP BY page`
  ).all();

  let adms = {};
  try {
    adms = await listCommunityAdmins(env.DB);
  } catch {
    adms = {};
  }

  const memberCounts = {};
  const mine = new Set();
  try {
    const { results: mc } = await env.DB.prepare(
      "SELECT community_slug, COUNT(*) AS n FROM community_members GROUP BY community_slug"
    ).all();
    for (const r of mc || []) memberCounts[r.community_slug] = Number(r.n || 0);
    const user = await getSessionUser(request, env);
    if (user) {
      const { results: my } = await env.DB.prepare(
        "SELECT community_slug FROM community_members WHERE user_id = ?"
      )
        .bind(user.id)
        .all();
      for (const r of my || []) mine.add(r.community_slug);
    }
  } catch {
    /* tabela ausente em ambiente local */
  }

  const comunidades = catalog.map((c) => {
    const posts = bySlug[c.slug] || { n: 0, last_at: null };
    let last = posts.last_at;
    for (const row of commentRows || []) {
      const page = row.page || "";
      const matches = (c.slug === "adm" && page === "/b/adm") || page.startsWith(`/b/${c.slug}/p/`);
      if (!matches) continue;
      if (!last || row.last_at > last) last = row.last_at;
    }
    return {
      slug: c.slug,
      name: c.name,
      title: c.title,
      description: c.description,
      posting: c.posting,
      href: communityHref(c.slug),
      post_count: posts.n + (c.slug === "adm" ? 1 : 0),
      last_activity: last,
      created_at: c.created_at || null,
      total_membros: memberCounts[c.slug] || 0,
      membro: mine.has(c.slug),
      adms: (adms[c.slug] || []).map((a) => ({
        username: a.username,
        is_primordial: a.is_primordial,
        primordial_n: a.primordial_n,
      })),
    };
  });
  return json({ comunidades });
}

function cleanText(raw, max) {
  return String(raw ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max + 1);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  const ctx = await getAdminContext(request, env);
  const deny = denyUnlessSite(ctx);
  if (deny) return errorJson(deny.erro, deny.status);
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);

  let data;
  try {
    data = await request.json();
  } catch {
    return errorJson("Pedido inválido.", 400);
  }
  const slug = String(data?.slug ?? "").trim().replace(/^\/?b\//, "").replace(/\/+$/, "").toLowerCase();
  if (!NEW_SLUG_RE.test(slug)) {
    return errorJson("Endereço inválido. Use 2 a 24 letras minúsculas, números, - ou _ (começando com letra ou número).", 400);
  }
  if (RESERVED_SLUGS.has(slug) || STATIC_B_DIRS.has(slug)) return errorJson("Esse endereço é reservado.", 400);
  const name = cleanText(data?.name ?? data?.title, 60);
  if (name.length < 2 || name.length > 60) return errorJson("O nome precisa ter de 2 a 60 caracteres.", 400);
  const description = cleanText(data?.description, 300);
  if (description.length > 300) return errorJson("A descrição pode ter no máximo 300 caracteres.", 400);

  if (await getCommunityDb(env.DB, slug)) return errorJson("Já existe uma comunidade com esse endereço.", 409);

  const now = new Date().toISOString();
  try {
    await env.DB.prepare(
      "INSERT INTO communities (slug, name, description, posting, created_at, created_by) VALUES (?, ?, ?, 'open', ?, ?)"
    )
      .bind(slug, name, description, now, ctx.user ? ctx.user.id : null)
      .run();
  } catch {
    return errorJson("Já existe uma comunidade com esse endereço.", 409);
  }
  if (ctx.user) {
    await env.DB.prepare(
      "INSERT OR IGNORE INTO community_admins (community_slug, user_id, added_by, created_at) VALUES (?, ?, ?, ?)"
    )
      .bind(slug, ctx.user.id, ctx.user.id, now)
      .run();
  }
  return json(
    {
      ok: true,
      comunidade: { slug, name, description, posting: "open", href: communityHref(slug), created_at: now },
    },
    201
  );
}
