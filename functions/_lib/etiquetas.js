// MOR-36: etiquetas (tags) em postagens e comentários.
// Escopo 'site' (ADMs do site) ou o slug de uma b/ (ADMs daquela b/). Cor: '0' padrão ou '1'..'8' (paleta --ac-N).
import { communityOfPage } from "./admins.js";

export const TAGS_MAX_ITEM = 3;        // etiquetas por item (autor + ADM, no total)
export const TAGS_MAX_SCOPE = 40;      // definições por escopo
export const TAG_NAME_MAX = 24;
export const TAG_DESC_MAX = 120;
export const TAG_EDIT_PER_MIN = 30;    // trocas de etiqueta em itens, por conta
export const TAGDEF_PER_HOUR = 60;     // criar/editar definições, por conta
export const TAG_TIPOS = { post: "post", postagem: "post", comment: "comment", comentario: "comment" };
const COLORS = new Set(["0", "1", "2", "3", "4", "5", "6", "7", "8"]);

export function cleanTagName(raw) {
  const s = String(raw == null ? "" : raw).normalize("NFC").replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim();
  if (!s) return null;
  if ([...s].length > TAG_NAME_MAX) return false;
  return s;
}
export function slugifyTag(name) {
  return String(name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, TAG_NAME_MAX);
}
export function cleanTagColor(raw) {
  const s = String(raw == null ? "0" : raw);
  return COLORS.has(s) ? s : null;
}
export function cleanTagDesc(raw) {
  if (raw == null) return "";
  const s = String(raw).normalize("NFC").replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim();
  return [...s].length > TAG_DESC_MAX ? false : s;
}

export function publicTag(t) {
  return { id: t.id, nome: t.name, slug: t.slug, cor: t.color || "0", descricao: t.description || "", escopo: t.scope };
}

// Escopo de etiquetas de um item: postagens → b/ da postagem; comentários → b/ da página (ou só 'site').
export function scopeOfPage(page) { return communityOfPage(page); }

// Etiquetas ativas disponíveis para um escopo (site + b/).
export async function availableTags(db, slug) {
  try {
    const { results } = await db.prepare(
      `SELECT id, scope, name, slug, color, description FROM tags
       WHERE active = 1 AND (scope = 'site' OR scope = ?) ORDER BY (scope = 'site') DESC, position, name`
    ).bind(slug || "").all();
    return results || [];
  } catch { return []; }
}

// Etiquetas de vários itens numa consulta (json_each, sem N+1). Só etiquetas ativas aparecem.
export async function tagsOf(db, tipo, ids) {
  const out = {};
  const list = [...new Set((ids || []).filter(Boolean))];
  for (const id of list) out[id] = [];
  if (!db || !list.length) return out;
  try {
    const { results } = await db.prepare(
      `SELECT it.item_id, it.added_by, t.id, t.scope, t.name, t.slug, t.color, t.description
       FROM item_tags it JOIN tags t ON t.id = it.tag_id
       WHERE it.item_type = ?1 AND t.active = 1 AND it.item_id IN (SELECT value FROM json_each(?2))
       ORDER BY (t.scope = 'site') DESC, t.position, t.name`
    ).bind(tipo, JSON.stringify(list)).all();
    for (const r of results || []) {
      if (!out[r.item_id]) continue;
      out[r.item_id].push({ ...publicTag(r), por_adm: Boolean(r.added_by && r.added_by !== "autor") });
    }
  } catch { /* tabela ainda não existe */ }
  return out;
}

export async function attachTags(db, tipo, items) {
  const map = await tagsOf(db, tipo, (items || []).map((x) => x && x.id));
  for (const it of items || []) if (it && it.id) it.etiquetas = map[it.id] || [];
  return items;
}

// Valida uma lista de ids pedida contra as etiquetas ativas do escopo. Devolve { ids } ou { erro }.
export async function validateTagIds(db, raw, slug, max = TAGS_MAX_ITEM) {
  if (raw == null) return { ids: [] };
  if (!Array.isArray(raw)) return { erro: "Etiquetas inválidas." };
  const ids = [...new Set(raw.map((x) => String(x || "").trim()).filter(Boolean))];
  if (ids.length > max) return { erro: `No máximo ${max} etiquetas${max < TAGS_MAX_ITEM ? " (as outras foram postas por um ADM)" : ""}.` };
  if (!ids.length) return { ids: [] };
  const allowed = new Set((await availableTags(db, slug)).map((t) => t.id));
  for (const id of ids) if (!allowed.has(id)) return { erro: "Etiqueta não disponível aqui." };
  return { ids };
}

export function insertTagStatements(db, tipo, itemId, ids, addedBy, iso) {
  return ids.map((tid) => db.prepare("INSERT OR IGNORE INTO item_tags (item_type, item_id, tag_id, added_by, created_at) VALUES (?, ?, ?, ?, ?)").bind(tipo, itemId, tid, addedBy, iso));
}
