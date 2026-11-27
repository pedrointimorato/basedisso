// MOR-38: imagens e vídeos enviados (R2 "basedisso-media", binding MEDIA). 1 arquivo por postagem/comentário.
// Quem pode enviar: contas que são ADM do site (em qualquer lugar), ADMs da própria b/, e contas em b/ que ligaram o envio.
// Quem enviou (uploader_id) nunca sai em API pública — itens anônimos continuam anônimos.
import { countRate, escapeHtml, recordRate } from "./shared.js";
import { canModerate } from "./admins.js";

export const IMG_MAX = 8 * 1024 * 1024;
export const VID_MAX = 50 * 1024 * 1024;
export const THUMB_MAX = 400 * 1024;
export const THUMB_SIDE = 250;
export const MIDIA_PER_HOUR = 12;
export const MIDIA_PER_DAY = 40;
export const PENDING_MAX = 5;
export const PENDING_TTL_MS = 6 * 3600 * 1000;
export const NAME_MAX = 80;

export const TIPOS = {
  "image/jpeg": { ext: "jpg", kind: "image", max: IMG_MAX },
  "image/png": { ext: "png", kind: "image", max: IMG_MAX },
  "image/gif": { ext: "gif", kind: "image", max: IMG_MAX },
  "image/webp": { ext: "webp", kind: "image", max: IMG_MAX },
  "video/mp4": { ext: "mp4", kind: "video", max: VID_MAX },
  "video/webm": { ext: "webm", kind: "video", max: VID_MAX },
};
const EXT_MIME = { jpg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", mp4: "video/mp4", webm: "video/webm" };
// URL pública sem extensão (/m/o/<id>, /m/t/<id>): a borda do Cloudflare não guarda cópia, então ocultar/remover vale na hora.
export const PATH_RE = /^(o|t)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;
export const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function ascii(b, off, str) {
  if (b.length < off + str.length) return false;
  for (let i = 0; i < str.length; i++) if (b[off + i] !== str.charCodeAt(i)) return false;
  return true;
}
const MP4_BRANDS = new Set(["isom", "iso2", "iso3", "iso4", "iso5", "iso6", "iso8", "mp41", "mp42", "avc1", "M4V ", "M4VP", "dash", "mmp4", "MSNV", "av01"]);

// Tipo real pelos primeiros bytes (ignora o nome e o Content-Type que o navegador mandou).
export function sniff(b) {
  if (!b || b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && ascii(b, 1, "PNG") && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (ascii(b, 0, "GIF87a") || ascii(b, 0, "GIF89a")) return "image/gif";
  if (ascii(b, 0, "RIFF") && ascii(b, 8, "WEBP")) return "image/webp";
  if (ascii(b, 4, "ftyp")) {
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
    return MP4_BRANDS.has(brand) ? "video/mp4" : null;
  }
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) {
    for (let i = 4; i < Math.min(b.length - 4, 80); i++) if (ascii(b, i, "webm")) return "video/webm";
    return null;
  }
  return null;
}

// Largura/altura das imagens lidas do próprio arquivo (o navegador só informa; aqui confere).
export function imageSize(b, mime) {
  try {
    if (mime === "image/png" && b.length >= 24) return { w: (b[16] << 24 | b[17] << 16 | b[18] << 8 | b[19]) >>> 0, h: (b[20] << 24 | b[21] << 16 | b[22] << 8 | b[23]) >>> 0 };
    if (mime === "image/gif" && b.length >= 10) return { w: b[6] | (b[7] << 8), h: b[8] | (b[9] << 8) };
    if (mime === "image/webp" && b.length >= 30) {
      if (ascii(b, 12, "VP8 ")) return { w: (b[26] | (b[27] << 8)) & 0x3fff, h: (b[28] | (b[29] << 8)) & 0x3fff };
      if (ascii(b, 12, "VP8L")) return { w: 1 + (((b[22] & 0x3f) << 8) | b[21]), h: 1 + (((b[24] & 0x0f) << 10) | (b[23] << 2) | ((b[22] & 0xc0) >> 6)) };
      if (ascii(b, 12, "VP8X")) return { w: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), h: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
    }
    if (mime === "image/jpeg") {
      let i = 2;
      while (i + 9 < b.length) {
        if (b[i] !== 0xff) { i++; continue; }
        const m = b[i + 1];
        if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7) || m === 0xff) { i++; continue; }
        const len = (b[i + 2] << 8) | b[i + 3];
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: (b[i + 5] << 8) | b[i + 6], w: (b[i + 7] << 8) | b[i + 8] };
        i += 2 + len;
      }
    }
  } catch { /* cai no valor do navegador */ }
  return null;
}

export function cleanInt(v, max) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 && n <= max ? n : null;
}

// Nome original: só o nome do arquivo, sem caracteres de controle, extensão trocada pela real.
export function cleanFileName(raw, ext) {
  let s = String(raw || "").split(/[\\/]/).pop() || "";
  s = s.normalize("NFC").replace(/[\u0000-\u001f\u007f<>:"|?*\u202a-\u202e\u2066-\u2069]/g, "").replace(/\s+/g, " ").trim();
  s = s.replace(/\.[A-Za-z0-9]{1,5}$/, "");
  if (!s || /^\.+$/.test(s)) s = "arquivo";
  const room = NAME_MAX - ext.length - 1;
  if (s.length > room) s = s.slice(0, room).trim();
  return `${s}.${ext}`;
}

export function fmtSize(bytes) {
  const n = Number(bytes || 0);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
export function fmtDur(s) {
  const t = Math.round(Number(s || 0));
  if (!t) return "";
  const m = Math.floor(t / 60), ss = String(t % 60).padStart(2, "0");
  return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

function thumbDims(w, h) {
  if (!w || !h) return { tw: null, th: null };
  const s = Math.min(1, THUMB_SIDE / Math.max(w, h));
  return { tw: Math.max(1, Math.round(w * s)), th: Math.max(1, Math.round(h * s)) };
}

export function publicMidia(r) {
  const t = TIPOS[r.mime] || { ext: "bin", kind: "image" };
  const { tw, th } = thumbDims(r.width, r.height);
  return {
    id: r.id,
    url: "/m/o/" + r.id,
    miniatura: "/m/t/" + r.id,
    tipo: t.kind,
    mime: r.mime,
    ext: t.ext.toUpperCase(),
    tamanho: Number(r.size_bytes || 0),
    largura: r.width == null ? null : Number(r.width),
    altura: r.height == null ? null : Number(r.height),
    duracao: r.duration == null ? null : Number(r.duration),
    mini_largura: tw,
    mini_altura: th,
    nome: r.original_name || "arquivo." + t.ext,
  };
}

// Mídia de vários itens numa consulta só (sem N+1).
export async function mediaOf(db, tipo, ids) {
  const out = {};
  const list = [...new Set((ids || []).filter(Boolean))];
  if (!db || !list.length) return out;
  try {
    const { results } = await db.prepare(
      `SELECT id, item_id, r2_key, thumb_key, mime, size_bytes, width, height, duration, original_name
       FROM media WHERE item_type = ?1 AND item_id IN (SELECT value FROM json_each(?2))`
    ).bind(tipo, JSON.stringify(list)).all();
    for (const r of results || []) out[r.item_id] = publicMidia(r);
  } catch { /* tabela ainda não existe */ }
  return out;
}

export async function attachMedia(db, tipo, items, skip) {
  const map = await mediaOf(db, tipo, (items || []).filter((x) => x && !(skip && skip(x))).map((x) => x.id));
  for (const it of items || []) if (it && it.id) it.midia = map[it.id] || null;
  return items;
}

export async function mediaEnabled(db, slug) {
  if (!db || !slug) return false;
  try {
    const r = await db.prepare("SELECT media_enabled FROM communities WHERE slug = ?").bind(slug).first();
    return Boolean(r && Number(r.media_enabled) === 1);
  } catch { return false; }
}

// slug = b/ do item (null = página fora de b/, só ADM do site).
export async function canUpload(env, ctx, slug) {
  if (!ctx || !ctx.user) return false;
  if (ctx.site) return true;
  if (!slug) return false;
  if (canModerate(ctx, slug)) return true;
  return mediaEnabled(env.DB, slug);
}

export async function rateMidia(db, user) {
  const key = "u:" + user.id;
  const now = Date.now();
  if ((await countRate(db, key, "midia", new Date(now - 3600000).toISOString())) >= MIDIA_PER_HOUR) return "Limite de envios de arquivos por hora atingido. Tente mais tarde.";
  if ((await countRate(db, key, "midia", new Date(now - 86400000).toISOString())) >= MIDIA_PER_DAY) return "Limite de envios de arquivos por dia atingido.";
  return null;
}
export async function recordMidia(db, user) {
  await recordRate(db, "u:" + user.id, "midia");
}

// Confere o arquivo pendente que o formulário quer anexar (do próprio usuário, mesmo escopo, ainda sem item).
export async function validateMidiaRef(env, raw, user, slug, ctx) {
  if (raw == null || raw === "") return { id: null };
  if (!user) return { erro: "Entre na sua conta para anexar arquivos.", status: 401 };
  const id = String(raw).trim().toLowerCase();
  if (!ID_RE.test(id)) return { erro: "Arquivo inválido.", status: 400 };
  const row = await env.DB.prepare("SELECT id, uploader_id, item_id, scope FROM media WHERE id = ?").bind(id).first().catch(() => null);
  if (!row || row.uploader_id !== user.id || row.item_id) return { erro: "Arquivo não encontrado. Envie de novo.", status: 400 };
  if ((row.scope || null) !== (slug || null)) return { erro: "Este arquivo foi enviado para outro lugar. Envie de novo.", status: 400 };
  if (!(await canUpload(env, ctx, slug))) return { erro: "O envio de arquivos não está liberado aqui.", status: 403 };
  return { id };
}

export function attachStatement(db, mediaId, tipo, itemId, now) {
  return db.prepare("UPDATE media SET item_type = ?, item_id = ?, attached_at = ? WHERE id = ? AND item_id IS NULL").bind(tipo, itemId, now, mediaId);
}

export async function removeMediaRows(env, rows) {
  const list = (rows || []).filter(Boolean);
  if (!list.length) return 0;
  const keys = [];
  for (const r of list) { keys.push(r.r2_key, r.thumb_key); }
  if (env.MEDIA) await env.MEDIA.delete(keys);
  await env.DB.prepare("DELETE FROM media WHERE id IN (SELECT value FROM json_each(?))").bind(JSON.stringify(list.map((r) => r.id))).run();
  return list.length;
}

// Limpeza: pendentes velhos e arquivos de itens apagados ou excluídos pelo autor. (Itens só ocultados mantêm o arquivo.)
export async function sweepMedia(env, limit = 25) {
  if (!env.DB || !env.MEDIA) return 0;
  try {
    const old = new Date(Date.now() - PENDING_TTL_MS).toISOString();
    const { results } = await env.DB.prepare(
      `SELECT m.id, m.r2_key, m.thumb_key FROM media m
       WHERE (m.item_id IS NULL AND m.created_at < ?1)
          OR (m.item_type = 'post' AND NOT EXISTS (SELECT 1 FROM posts p WHERE p.id = m.item_id AND p.author_deleted_at IS NULL))
          OR (m.item_type = 'comment' AND NOT EXISTS (SELECT 1 FROM comments c WHERE c.id = m.item_id AND c.author_deleted_at IS NULL))
       LIMIT ?2`
    ).bind(old, limit).all();
    return await removeMediaRows(env, results || []);
  } catch { return 0; }
}

// Para servir /m/<chave>: o arquivo só sai se o item estiver visível.
export async function mediaForId(db, id) {
  return db.prepare(
    `SELECT m.id, m.r2_key, m.thumb_key, m.mime, m.original_name, m.item_type, m.item_id,
       CASE m.item_type
         WHEN 'post' THEN (SELECT 1 FROM posts p WHERE p.id = m.item_id AND p.hidden = 0 AND p.author_deleted_at IS NULL)
         WHEN 'comment' THEN (SELECT 1 FROM comments c WHERE c.id = m.item_id AND c.hidden = 0 AND c.author_deleted_at IS NULL
           AND NOT EXISTS (SELECT 1 FROM posts p WHERE c.page = '/b/' || p.community || '/p/' || p.id AND (p.hidden = 1 OR p.author_deleted_at IS NOT NULL)))
       END AS visivel
     FROM media m WHERE m.id = ?1 AND m.item_id IS NOT NULL`
  ).bind(id).first();
}

export function mimeOfKey(key) {
  const ext = key.split(".").pop();
  return EXT_MIME[ext] || "application/octet-stream";
}

// HTML do arquivo (miniatura + "62 KB JPG" embaixo). O clique (abrir/fechar) é do /midia.js.
export function midiaHtml(m, opts = {}) {
  if (!m) return "";
  const video = m.tipo === "video";
  const info = `${fmtSize(m.tamanho)} ${escapeHtml(m.ext)}${video && m.duracao ? " · " + fmtDur(m.duracao) : ""}`;
  const dims = m.mini_largura && m.mini_altura ? ` width="${m.mini_largura}" height="${m.mini_altura}"` : "";
  const data = escapeHtml(JSON.stringify(m));
  return `<figure class="bd-midia bd-midia-${video ? "video" : "image"}" data-midia="${data}"${opts.removivel ? ' data-removivel="1"' : ""}>`
    + `<a class="bd-midia-thumb" href="${escapeHtml(m.url)}" target="_blank" rel="noopener" title="${video ? "assistir" : "abrir no tamanho original"}">`
    + `<img class="bd-midia-mini" src="${escapeHtml(m.miniatura)}"${dims} alt="${video ? "vídeo" : "imagem"} anexad${video ? "o" : "a"}" loading="lazy" decoding="async">`
    + (video ? '<span class="bd-midia-play" aria-hidden="true">▶</span>' : "")
    + `<span class="bd-midia-ph">[${video ? "vídeo" : "imagem"}]</span></a>`
    + `<figcaption class="bd-midia-cap">${opts.nome ? `<span class="bd-midia-nome" title="${escapeHtml(m.nome)}">${escapeHtml(m.nome)}</span>` : ""}<span class="bd-midia-info">${info}</span></figcaption></figure>`;
}
