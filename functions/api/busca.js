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
    "/adm": "/adm/",
    "/s": "/s/",
    "/s/biblia-amarela": "/s/biblia-amarela.html",
  };
  const base = map[page] || (page && page.startsWith("/") ? page : "/");
  return id ? `${base}#c-${id}` : `${base}#comentarios`;
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
    return json({ q, comentarios: [] });
  }
  const terms = termsOf(q);
  if (!terms.length) {
    return json({ q, comentarios: [] });
  }
  if (!env.DB) {
    return json({ q, comentarios: [] });
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
    return json({ q, comentarios: [] });
  }

  const selectSql = `SELECT c.id, c.page, c.parent_id, c.name, c.body, c.created_at, u.username
       FROM comments c
       LEFT JOIN users u ON u.id = c.user_id`;

  let results;
  try {
    const out = await env.DB.prepare(
      `${selectSql}
       WHERE c.hidden = 0
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
         WHERE c.hidden = 0
         ORDER BY c.created_at DESC
         LIMIT 400`
      ).all();
      results = out.results || [];
    } catch {
      return json({ q, comentarios: [] });
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
  return json({ q, comentarios });
}
