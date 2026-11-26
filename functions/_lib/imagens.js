// Imagens por link (espelhado em /account.js → BDAccount.img). Sem proxy: o navegador carrega direto.
import { escapeHtml } from "./shared.js";

export const MAX_IMAGES_PER_TEXT = 4;
const EXT_RE = /\.(jpe?g|png|gif|webp|avif)$/i;
const IMG_HOSTS = new Set(["i.imgur.com", "i.redd.it", "pbs.twimg.com"]);
const IMGUR_PAGE_RE = /^\/([A-Za-z0-9]{5,10})(?:\.[a-z0-9]{3,4})?\/?$/;

// URL de imagem normalizada (string) ou null.
export function imageUrl(raw) {
  const s = String(raw ?? "").trim();
  if (!s || s.length > 500 || !/^https?:\/\//i.test(s)) return null;
  let u;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if ((u.protocol !== "http:" && u.protocol !== "https:") || u.username || u.password) return null;
  const host = u.hostname.toLowerCase();
  if (host === "imgur.com" || host === "www.imgur.com" || host === "m.imgur.com") {
    const m = u.pathname.match(IMGUR_PAGE_RE);
    return m ? `https://i.imgur.com/${m[1]}.jpg` : null;
  }
  if (IMG_HOSTS.has(host) || EXT_RE.test(u.pathname)) return u.href;
  return null;
}

// Imagens soltas num texto (palavras separadas por espaço que são URLs de imagem), sem repetir.
// Devolve [{ src, href }] (href = o link como foi escrito, aberto ao clicar).
export function imagesInText(text, max = MAX_IMAGES_PER_TEXT) {
  const out = [];
  for (const tok of String(text || "").split(/\s+/)) {
    if (out.length >= max) break;
    const img = imageUrl(tok);
    if (img && !out.some((x) => x.src === img)) out.push({ src: img, href: tok });
  }
  return out;
}

// <a><img></a> seguro (tudo escapado). original = link a abrir.
export function imageHtml(src, original, cls = "bd-img-inline") {
  const s = escapeHtml(src);
  const o = escapeHtml(original || src);
  return `<a class="bd-img-link ${cls}" href="${o}" target="_blank" rel="noopener noreferrer nofollow"><img class="bd-img" src="${s}" alt="imagem (abre o original)" loading="lazy" decoding="async" referrerpolicy="no-referrer"></a>`;
}
