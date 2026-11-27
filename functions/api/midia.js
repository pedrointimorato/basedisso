// MOR-38: GET /api/midia?b=slug | ?page=/b/x/p/id → { pode, ... }   POST /api/midia (multipart) → envia 1 arquivo pendente.
// O arquivo fica "pendente" (sem item) até a postagem/comentário ser publicada com { midia: id }.
import { errorJson, isSameOrigin, json, normalizePage } from "../_lib/shared.js";
import { communityOfPage, getAdminContext } from "../_lib/admins.js";
import { getCommunityDb } from "../_lib/comunidades.js";
import {
  IMG_MAX, VID_MAX, THUMB_MAX, PENDING_MAX, TIPOS, canUpload, cleanFileName, cleanInt, imageSize, mediaEnabled,
  publicMidia, rateMidia, recordMidia, sniff, sweepMedia,
} from "../_lib/midia.js";

async function scopeOf(env, b, page) {
  if (b != null && b !== "") {
    const c = await getCommunityDb(env.DB, String(b));
    if (!c) return { erro: "Comunidade não encontrada.", status: 404 };
    return { slug: c.slug };
  }
  const p = normalizePage(page || "");
  if (!p) return { erro: "Informe a comunidade ou a página.", status: 400 };
  return { slug: communityOfPage(p) };
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  if (!env.DB) return json({ pode: false });
  const sc = await scopeOf(env, url.searchParams.get("b"), url.searchParams.get("page"));
  if (sc.erro) return errorJson(sc.erro, sc.status);
  const ctx = await getAdminContext(request, env);
  const pode = Boolean(env.MEDIA) && (await canUpload(env, ctx, sc.slug));
  return json({
    pode,
    b: sc.slug,
    liberado_na_b: await mediaEnabled(env.DB, sc.slug),
    limites: { imagem: IMG_MAX, video: VID_MAX },
    tipos: Object.keys(TIPOS),
  }, 200, { "Cache-Control": "no-store" });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB || !env.MEDIA) return errorJson("Envio de arquivos indisponível.", 503);
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  const ctx = await getAdminContext(request, env);
  if (!ctx.user) return errorJson("Entre na sua conta para enviar arquivos.", 401);
  const len = Number(request.headers.get("Content-Length") || 0);
  if (len > VID_MAX + 2 * 1024 * 1024) return errorJson("Arquivo grande demais (vídeos até 50 MB, imagens até 8 MB).", 413);
  if (!/^multipart\/form-data/i.test(request.headers.get("Content-Type") || "")) return errorJson("Pedido inválido.", 400);

  let form;
  try { form = await request.formData(); } catch { return errorJson("Pedido inválido.", 400); }
  const sc = await scopeOf(env, form.get("b"), form.get("page"));
  if (sc.erro) return errorJson(sc.erro, sc.status);
  if (!(await canUpload(env, ctx, sc.slug))) {
    return errorJson(sc.slug ? `O envio de arquivos não está liberado em b/${sc.slug}.` : "Aqui só ADMs do site podem enviar arquivos.", 403);
  }
  const file = form.get("arquivo");
  const thumb = form.get("miniatura");
  if (!file || typeof file === "string" || !file.size) return errorJson("Escolha um arquivo.", 400);
  if (!thumb || typeof thumb === "string" || !thumb.size) return errorJson("Faltou a miniatura do arquivo. Tente de novo.", 400);

  const head = new Uint8Array(await file.slice(0, 262144).arrayBuffer());
  const mime = sniff(head);
  const tipo = mime && TIPOS[mime];
  if (!tipo) return errorJson("Tipo de arquivo não aceito. Use JPG, PNG, GIF, WebP, MP4 ou WebM.", 415);
  if (file.size > tipo.max) return errorJson(tipo.kind === "video" ? "Vídeo grande demais (máx. 50 MB)." : "Imagem grande demais (máx. 8 MB).", 413);
  const thead = new Uint8Array(await thumb.slice(0, 64).arrayBuffer());
  const tmime = sniff(thead);
  if (tmime !== "image/jpeg" && tmime !== "image/webp" && tmime !== "image/png") return errorJson("Miniatura inválida.", 400);
  if (thumb.size > THUMB_MAX) return errorJson("Miniatura grande demais.", 400);

  const rate = await rateMidia(env.DB, ctx.user);
  if (rate) return errorJson(rate, 429);
  const pend = await env.DB.prepare("SELECT COUNT(*) AS n FROM media WHERE uploader_id = ? AND item_id IS NULL").bind(ctx.user.id).first();
  if (Number(pend?.n || 0) >= PENDING_MAX) return errorJson("Você tem arquivos enviados e ainda não publicados. Publique ou remova algum antes de enviar outro.", 429);

  let w = cleanInt(form.get("largura"), 20000), h = cleanInt(form.get("altura"), 20000);
  if (tipo.kind === "image") {
    const real = imageSize(head, mime);
    if (real && real.w > 0 && real.h > 0) { w = real.w; h = real.h; }
  }
  let dur = null;
  if (tipo.kind === "video") {
    const d = Number(form.get("duracao"));
    dur = Number.isFinite(d) && d > 0 && d < 36000 ? Math.round(d * 10) / 10 : null;
  }
  const id = crypto.randomUUID();
  const key = `o/${id}.${tipo.ext}`;
  const tkey = `t/${id}.jpg`;
  const nome = cleanFileName(file.name, tipo.ext);
  const now = new Date().toISOString();
  await env.MEDIA.put(key, file, { httpMetadata: { contentType: mime }, customMetadata: { midia: id } });
  await env.MEDIA.put(tkey, thumb, { httpMetadata: { contentType: tmime }, customMetadata: { midia: id } });
  try {
    await env.DB.prepare(
      `INSERT INTO media (id, item_type, item_id, scope, r2_key, thumb_key, mime, size_bytes, thumb_bytes, width, height, duration, original_name, uploader_id, created_at)
       VALUES (?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, sc.slug || null, key, tkey, mime, file.size, thumb.size, w, h, dur, nome, ctx.user.id, now).run();
  } catch (e) {
    await env.MEDIA.delete([key, tkey]);
    return errorJson("Não foi possível guardar o arquivo.", 500);
  }
  await recordMidia(env.DB, ctx.user);
  context.waitUntil(sweepMedia(env));
  return json({ ok: true, midia: publicMidia({ id, r2_key: key, thumb_key: tkey, mime, size_bytes: file.size, width: w, height: h, duration: dur, original_name: nome }) }, 201);
}
