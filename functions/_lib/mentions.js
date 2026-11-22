/** Usernames: 3-20 letters, digits or underscore. */
export const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

export function extractMentionNames(text) {
  const names = [];
  const seen = new Set();
  const s = String(text || "");
  const re = /(?:^|[^A-Za-z0-9_])>>([A-Za-z0-9_]{3,20})(?![A-Za-z0-9_])|(?:^|[^A-Za-z0-9._])@([A-Za-z0-9_]{3,20})(?![A-Za-z0-9_])/g;
  let m;
  while ((m = re.exec(s))) {
    const raw = m[1] || m[2];
    const lc = raw.toLowerCase();
    if (!seen.has(lc)) {
      seen.add(lc);
      names.push(raw);
    }
  }
  return names;
}

/** Split text into { type:'text', value } | { type:'mention', raw, kind, name }. */
export function tokenizeMentions(text) {
  const s = String(text || "");
  const parts = [];
  const re = /(?:^|[^A-Za-z0-9_])>>([A-Za-z0-9_]{3,20})(?![A-Za-z0-9_])|(?:^|[^A-Za-z0-9._])@([A-Za-z0-9_]{3,20})(?![A-Za-z0-9_])/g;
  let last = 0;
  let m;
  while ((m = re.exec(s))) {
    const token = m[1] ? `>>${m[1]}` : `@${m[2]}`;
    const name = m[1] || m[2];
    const kind = m[1] ? ">>" : "@";
    // The regex consumes a leading non-username char (except at start). Keep it as text.
    let start = m.index;
    const matched = m[0];
    if (matched.startsWith(">>") || matched.startsWith("@")) {
      // started at beginning
    } else {
      start = m.index + 1;
      if (last < start) parts.push({ type: "text", value: s.slice(last, start) });
      last = start;
    }
    if (last < start) parts.push({ type: "text", value: s.slice(last, start) });
    parts.push({ type: "mention", raw: token, kind, name });
    last = start + token.length;
  }
  if (last < s.length) parts.push({ type: "text", value: s.slice(last) });
  if (!parts.length) parts.push({ type: "text", value: s });
  return parts;
}

export async function lookupMentions(db, text) {
  const names = extractMentionNames(text);
  const map = {};
  if (!names.length || !db) return map;
  const unique = [...new Set(names.map((n) => n.toLowerCase()))];
  const placeholders = unique.map(() => "?").join(",");
  const { results } = await db
    .prepare(
      `SELECT username, username_lc, is_admin, is_primordial, primordial_n FROM users WHERE username_lc IN (${placeholders})`
    )
    .bind(...unique)
    .all();
  for (const row of results || []) {
    map[row.username_lc] = { username: row.username, is_admin: Boolean(row.is_admin), is_primordial: Boolean(row.is_primordial), primordial_n: row.primordial_n == null ? null : Number(row.primordial_n) };
  }
  return map;
}
