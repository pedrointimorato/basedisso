import { json } from "../_lib/shared.js";

const Q_MIN = 2;
const Q_MAX = 80;
const TERM_MAX = 5;
const RESULT_MAX = 40;

function fold(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function sanitizeLike(s) {
  return String(s).replace(/[\\%_]/g, "");
}

function termsOf(q) {
  const seen = new Set();
  const terms = [];
  for (const raw of fold(q).split(/\s+/)) {
    if (raw.length < 2 || seen.has(raw)) continue;
    seen.add(raw);
    terms.push(raw);
    if (terms.length >= TERM_MAX) break;
  }
  return terms;
}

function sqlFold(expr) {
  const pairs = [
    ["á", "a"],
    ["à", "a"],
    ["â", "a"],
    ["ã", "a"],
    ["ä", "a"],
    ["é", "e"],
    ["è", "e"],
    ["ê", "e"],
    ["í", "i"],
    ["ì", "i"],
    ["ó", "o"],
    ["ò", "o"],
    ["ô", "o"],
    ["õ", "o"],
    ["ú", "u"],
    ["ù", "u"],
    ["ü", "u"],
    ["ç", "c"],
  ];
  let out = `lower(${expr})`;
  for (const [from, to] of pairs) {
    out = `replace(${out}, '${from}', '${to}')`;
  }
  return out;
}

function pageHref(page, id) {
  const map = {
    "/adm": "/b/adm/",
    "/b/adm": "/b/adm/",
    "/l": "/l/",
    "/s": "/l/",
    "/l/biblia-amarela": "/l/biblia-amarela.html",
    "/s/biblia-amarela": "/l/biblia-amarela.html",
  };
  const base = map[page] || (page && page.startsWith("/") ? page : "/");
  return id ? `${base}#c-${id}` : `${base}#comentarios`;
}

function matchesPost(row, terms) {
  const hay = fold(`${row.title || ""} ${row.name || ""} ${row.username || ""} ${row.body || ""} ${row.link || ""} ${row.community || ""}`);
  return terms.every((t) => hay.includes(t));
}

async function searchPosts(db, q, terms) {
  const foldedCols = [
    sqlFold("p.title"),
    sqlFold("p.body"),
    sqlFold("p.name"),
    sqlFold("IFNULL(p.link, '')"),
    sqlFold("IFNULL(u.username, '')"),
    sqlFold("p.community"),
  ];
  const termClause = terms
    .map(() => `(${foldedCols.map((c) => `${c} LIKE ?`).join(" OR ")})`)
    .join(" AND ");
  const binds = [];
  for (const term of terms) {
    const safe = sanitizeLike(term);
    if (safe.length < Q_MIN) continue;
    const pat = `%${safe}%`;
    binds.push(pat, pat, pat, pat, pat, pat);
  }
  if (!binds.length) return [];
  const selectSql = `SELECT p.id, p.community, p.title, p.body, p.link, p.name, p.created_at, u.username
       FROM posts p
       LEFT JOIN users u ON u.id = p.user_id`;
  let results;
  try {
    const out = await db
      .prepare(
        `${selectSql}
         WHERE p.hidden = 0 AND p.author_deleted_at IS NULL AND (${termClause})
         ORDER BY p.created_at DESC
         LIMIT 40`
      )
      .bind(...binds)
      .all();
    results = out.results || [];
  } catch {
    try {
      const out = await db.prepare(`${selectSql} WHERE p.hidden = 0 AND p.author_deleted_at IS NULL ORDER BY p.created_at DESC LIMIT 400`).all();
      results = out.results || [];
    } catch {
      return [];
    }
  }
  const postagens = [];
  for (const row of results) {
    if (!matchesPost(row, terms)) continue;
    const author = row.username || row.name || "anônimo";
    postagens.push({
      id: row.id,
      tipo: "postagem",
      title: row.title,
      author,
      url: `/b/${row.community}/p/${row.id}`,
      body: row.body || row.link || "",
      created_at: row.created_at,
    });
  }
  return postagens;
}


function matchesAll(row, terms) {
  const hay = fold(`${row.name || ""} ${row.username || ""} ${row.body || ""}`);
  return terms.every((t) => hay.includes(t));
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim().slice(0, Q_MAX);
  if (q.length < Q_MIN) {
    return json({ q, comentarios: [], postagens: [] });
  }
  const terms = termsOf(q);
  if (!terms.length) {
    return json({ q, comentarios: [], postagens: [] });
  }
  if (!env.DB) {
    return json({ q, comentarios: [], postagens: [] });
  }

  const foldedCols = [
    sqlFold("c.body"),
    sqlFold("c.name"),
    sqlFold("IFNULL(u.username, '')"),
  ];
  const termClause = terms
    .map(() => `(${foldedCols.map((c) => `${c} LIKE ?`).join(" OR ")})`)
    .join(" AND ");
  const binds = [];
  for (const term of terms) {
    const safe = sanitizeLike(term);
    if (safe.length < Q_MIN) continue;
    const pat = `%${safe}%`;
    binds.push(pat, pat, pat);
  }
  if (!binds.length) {
    return json({ q, comentarios: [], postagens: [] });
  }

  const selectSql = `SELECT c.id, c.page, c.parent_id, c.name, c.body, c.created_at, u.username
       FROM comments c
       LEFT JOIN users u ON u.id = c.user_id`;

  let results;
  try {
    const out = await env.DB.prepare(
      `${selectSql}
       WHERE c.hidden = 0 AND c.author_deleted_at IS NULL
         AND (${termClause})
       ORDER BY c.created_at DESC
       LIMIT 40`
    )
      .bind(...binds)
      .all();
    results = out.results || [];
  } catch (err) {
    try {
      const out = await env.DB.prepare(
        `${selectSql}
         WHERE c.hidden = 0 AND c.author_deleted_at IS NULL
         ORDER BY c.created_at DESC
         LIMIT 400`
      ).all();
      results = out.results || [];
    } catch {
      return json({ q, comentarios: [], postagens: [] });
    }
  }

  const comentarios = [];
  for (const row of results) {
    if (!matchesAll(row, terms)) continue;
    const author = row.username || row.name || "anônimo";
    comentarios.push({
      id: row.id,
      tipo: "comentario",
      title: `Comentário de ${author}`,
      author,
      url: pageHref(row.page, row.id),
      page: row.page,
      body: row.body || "",
      created_at: row.created_at,
    });
  }
  let postagens = [];
  try {
    postagens = await searchPosts(env.DB, q, terms);
  } catch {
    postagens = [];
  }
  return json({ q, comentarios, postagens });
}
