// MOR-38: /m/o/<id> (original) e /m/t/<id> (miniatura), lidos do R2 (binding MEDIA). Sem extensão na URL de propósito (ver PATH_RE).
// Só sai se o item estiver visível (ocultado/excluído → 404). Suporta Range (vídeo), ETag/304 e HEAD.
import { PATH_RE, TIPOS, mediaForId } from "../_lib/midia.js";

function notFound() {
  return new Response("Arquivo não encontrado.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

function baseHeaders(row, key, obj) {
  const h = new Headers();
  const original = key === row.r2_key;
  const type = original && TIPOS[row.mime] ? row.mime : (obj.httpMetadata && obj.httpMetadata.contentType) || "image/jpeg";
  h.set("Content-Type", type);
  h.set("ETag", obj.httpEtag);
  h.set("Accept-Ranges", "bytes");
  h.set("Cache-Control", "private, max-age=1800");
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Content-Security-Policy", "default-src 'none'; sandbox");
  h.set("Cross-Origin-Resource-Policy", "same-origin");
  if (original) h.set("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(row.original_name || "arquivo")}`);
  return h;
}

async function serve(context, head) {
  const { request, env, params } = context;
  const path = Array.isArray(params.path) ? params.path.join("/") : String(params.path || "");
  const pm = path.toLowerCase().match(PATH_RE);
  if (!pm || !env.DB || !env.MEDIA) return notFound();
  const row = await mediaForId(env.DB, pm[2]).catch(() => null);
  if (!row || !row.visivel) return notFound();
  const key = pm[1] === "o" ? row.r2_key : row.thumb_key;

  if (head) {
    const obj = await env.MEDIA.head(key);
    if (!obj) return notFound();
    const h = baseHeaders(row, key, obj);
    h.set("Content-Length", String(obj.size));
    return new Response(null, { status: 200, headers: h });
  }

  const inm = request.headers.get("If-None-Match");
  const hasRange = request.headers.has("Range");
  let obj;
  try {
    obj = await env.MEDIA.get(key, { range: hasRange ? request.headers : undefined, onlyIf: inm && !hasRange ? { etagDoesNotMatch: inm.replace(/^W\//, "").replace(/"/g, "") } : undefined });
  } catch (e) {
    const meta = await env.MEDIA.head(key).catch(() => null);
    return new Response("Faixa inválida.", { status: 416, headers: { "Content-Range": `bytes */${meta ? meta.size : 0}`, "Cache-Control": "no-store" } });
  }
  if (!obj) return notFound();
  const h = baseHeaders(row, key, obj);
  if (!("body" in obj) || !obj.body) return new Response(null, { status: 304, headers: h });
  const size = obj.size;
  if (hasRange && obj.range) {
    const r = obj.range;
    let off, len;
    if (r.suffix != null) { len = Math.min(r.suffix, size); off = size - len; }
    else { off = r.offset || 0; len = r.length != null ? r.length : size - off; }
    h.set("Content-Range", `bytes ${off}-${off + len - 1}/${size}`);
    h.set("Content-Length", String(len));
    return new Response(obj.body, { status: 206, headers: h });
  }
  h.set("Content-Length", String(size));
  return new Response(obj.body, { status: 200, headers: h });
}

export function onRequestGet(context) { return serve(context, false); }
export function onRequestHead(context) { return serve(context, true); }
