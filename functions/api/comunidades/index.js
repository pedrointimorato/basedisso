import { errorJson, json } from "../../_lib/shared.js";
import { listCommunities, communityHref } from "../../_lib/comunidades.js";

export async function onRequestGet(context) {
  const { env } = context;
  const catalog = listCommunities();
  if (!env.DB) {
    return json({
      comunidades: catalog.map((c) => ({
        ...c,
        href: communityHref(c.slug),
        post_count: c.slug === "adm" ? 1 : 0,
        last_activity: null,
      })),
    });
  }

  const { results: postRows } = await env.DB.prepare(
    `SELECT community, COUNT(*) AS n, MAX(created_at) AS last_at
     FROM posts WHERE hidden = 0 GROUP BY community`
  ).all();
  const bySlug = {};
  for (const row of postRows || []) {
    bySlug[row.community] = { n: Number(row.n || 0), last_at: row.last_at || null };
  }

  const { results: commentRows } = await env.DB.prepare(
    `SELECT page, MAX(created_at) AS last_at, COUNT(*) AS n
     FROM comments
     WHERE hidden = 0 AND (page = '/b/adm' OR page LIKE '/b/%/p/%')
     GROUP BY page`
  ).all();

  const comunidades = catalog.map((c) => {
    const posts = bySlug[c.slug] || { n: 0, last_at: null };
    let last = posts.last_at;
    let extra = 0;
    for (const row of commentRows || []) {
      const page = row.page || "";
      const matches =
        (c.slug === "adm" && (page === "/b/adm" || page.startsWith("/b/adm/p/"))) ||
        page.startsWith(`/b/${c.slug}/p/`);
      if (!matches) continue;
      extra += 0;
      if (!last || row.last_at > last) last = row.last_at;
    }
    const postCount = posts.n + (c.slug === "adm" ? 1 : 0);
    return {
      slug: c.slug,
      name: c.name,
      title: c.title,
      description: c.description,
      posting: c.posting,
      href: communityHref(c.slug),
      post_count: postCount,
      last_activity: last,
    };
  });
  return json({ comunidades });
}
