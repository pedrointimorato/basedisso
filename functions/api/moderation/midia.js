// MOR-38: GET /api/moderation/midia → b/ que este ADM gere, com o envio de arquivos ligado/desligado.
// PUT { b, ativo } liga/desliga o envio para contas em b/<b> (ADMs do site e da própria b/ sempre podem enviar).
import { countRate, errorJson, isSameOrigin, json, recordRate } from "../../_lib/shared.js";
import { canModerate, getAdminContext } from "../../_lib/admins.js";
import { getCommunityDb, listCommunitiesDb } from "../../_lib/comunidades.js";
import { IMG_MAX, VID_MAX } from "../../_lib/midia.js";

async function guard(request, env) {
  if (!env.DB) return { res: errorJson("Serviço indisponível.", 503) };
  const ctx = await getAdminContext(request, env);
  if (!ctx.loggedIn) return { res: errorJson("Não autorizado.", 401) };
  if (!ctx.any) return { res: errorJson("Apenas ADMs.", 403) };
  return { ctx };
}

async function flags(db) {
  const { results } = await db.prepare("SELECT slug, media_enabled FROM communities").all();
  const m = {};
  for (const r of results || []) m[r.slug] = Number(r.media_enabled) === 1;
  return m;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const g = await guard(request, env);
  if (g.res) return g.res;
  const all = await listCommunitiesDb(env.DB);
  const f = await flags(env.DB);
  const comunidades = all.filter((c) => canModerate(g.ctx, c.slug)).map((c) => ({ slug: c.slug, nome: c.name || c.slug, ativo: Boolean(f[c.slug]) }));
  return json({ comunidades, site: Boolean(g.ctx.site), limites: { imagem: IMG_MAX, video: VID_MAX } }, 200, { "Cache-Control": "no-store" });
}

export async function onRequestPut(context) {
  const { request, env } = context;
  const g = await guard(request, env);
  if (g.res) return g.res;
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  let data;
  try { data = await request.json(); } catch { return errorJson("Pedido inválido.", 400); }
  const c = await getCommunityDb(env.DB, String(data?.b || ""));
  if (!c) return errorJson("Comunidade não encontrada.", 404);
  if (!canModerate(g.ctx, c.slug)) return errorJson(`Apenas ADMs do site ou de b/${c.slug}.`, 403);
  if (typeof data?.ativo !== "boolean") return errorJson("Informe ativo: true ou false.", 400);
  if (g.ctx.user) {
    const key = "u:" + g.ctx.user.id;
    if ((await countRate(env.DB, key, "midiadef", new Date(Date.now() - 3600000).toISOString())) >= 60) return errorJson("Limite de mudanças por hora atingido.", 429);
    await recordRate(env.DB, key, "midiadef");
  }
  const exists = await env.DB.prepare("SELECT slug FROM communities WHERE slug = ?").bind(c.slug).first();
  if (exists) {
    await env.DB.prepare("UPDATE communities SET media_enabled = ? WHERE slug = ?").bind(data.ativo ? 1 : 0, c.slug).run();
  } else {
    await env.DB.prepare("INSERT INTO communities (slug, name, description, posting, created_at, media_enabled) VALUES (?, ?, ?, 'open', ?, ?)")
      .bind(c.slug, c.name || c.slug, c.description || "", new Date().toISOString(), data.ativo ? 1 : 0).run();
  }
  return json({ ok: true, b: c.slug, ativo: data.ativo });
}
