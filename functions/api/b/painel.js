// Painel lateral das b/ (só no computador): postagens recentes de todas as bases + comunidades com contagens.
// Público e igual para todo mundo: sem autor real de anônimos (anon_by), sem ip_hash, sem corpo/imagens.
// Leve: 3 consultas pequenas e cache de borda por 60 s.
import { json } from "../../_lib/shared.js";
import { communityHref, listCommunitiesDb, publicPost } from "../../_lib/comunidades.js";
import { postsSelectSql } from "../../_lib/posts.js";

const POSTS_MAX = 12;
const COMMS_MAX = 12;
const TTL = 60;

function domainOf(link, slug) {
  if (!link) return "self." + slug;
  try { return new URL(link).hostname.replace(/^www\./, ""); } catch { return null; }
}

export async function buildPanel(db) {
  const catalog = await listCommunitiesDb(db);
  const known = new Set(catalog.map((c) => c.slug));
  if (!db) return { postagens: [], comunidades: catalog.map((c) => ({ slug: c.slug, nome: c.name, href: communityHref(c.slug), postagens: 0, membros: 0, ultima_atividade: null })) };
  const { results: rows } = await db
    .prepare(`${postsSelectSql()} WHERE p.hidden = 0 AND p.author_deleted_at IS NULL ORDER BY p.created_at DESC LIMIT ?`)
    .bind(POSTS_MAX)
    .all();
  const postagens = (rows || []).filter((r) => known.has(r.community)).map((row) => {
    const p = publicPost(row);
    const u = p.usuario;
    return {
      id: p.id,
      b: p.community,
      titulo: p.title,
      url: p.url,
      dominio: domainOf(p.link, p.community),
      criado_em: p.created_at,
      comentarios: p.comment_count,
      fixado: p.fixado,
      enquete: Boolean(p.enquete),
      autor: {
        nome: p.name || "anônimo",
        anonimo: Boolean(p.anonimo),
        conta: Boolean(u),
        selo: u && u.is_admin ? "M" : u && u.b_admin ? "b" : null,
      },
    };
  });
  const { results: counts } = await db
    .prepare("SELECT community, COUNT(*) AS n, MAX(created_at) AS last_at FROM posts WHERE hidden = 0 AND author_deleted_at IS NULL GROUP BY community")
    .all();
  const by = {};
  for (const r of counts || []) by[r.community] = { n: Number(r.n || 0), last: r.last_at || null };
  const members = {};
  try {
    const { results: mc } = await db.prepare("SELECT community_slug, COUNT(*) AS n FROM community_members GROUP BY community_slug").all();
    for (const r of mc || []) members[r.community_slug] = Number(r.n || 0);
  } catch { /* tabela ausente em ambiente local */ }
  const comunidades = catalog.map((c) => ({
    slug: c.slug,
    nome: c.name || c.slug,
    href: communityHref(c.slug),
    // b/adm tem um aviso fixo na página (fora do D1), contado como em /api/comunidades.
    postagens: (by[c.slug] ? by[c.slug].n : 0) + (c.slug === "adm" ? 1 : 0),
    membros: members[c.slug] || 0,
    ultima_atividade: by[c.slug] ? by[c.slug].last : null,
  }));
  comunidades.sort((a, b) => String(b.ultima_atividade || "").localeCompare(String(a.ultima_atividade || "")) || b.postagens - a.postagens || a.slug.localeCompare(b.slug));
  return { postagens, comunidades: comunidades.slice(0, COMMS_MAX), total_comunidades: comunidades.length };
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const key = new Request(new URL("/api/b/painel?c=1", request.url).toString(), { method: "GET" });
  if (cache) {
    const hit = await cache.match(key);
    if (hit) return hit;
  }
  const data = await buildPanel(env.DB);
  const res = json({ ...data, gerado_em: new Date().toISOString() }, 200, { "Cache-Control": `public, max-age=${TTL}` });
  if (cache) context.waitUntil(cache.put(key, res.clone()));
  return res;
}
