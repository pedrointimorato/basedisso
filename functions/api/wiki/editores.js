// GET  /api/wiki/editores -> contas autorizadas a editar a wiki (só ADM do site).
// POST /api/wiki/editores { usuario } -> autoriza uma conta (só ADM do site).
import { json, errorJson } from "../../_lib/shared.js";
import { findUserByRef, isSiteAdmin } from "../../_lib/admins.js";
import { guarda, lerJson, limitar, listarEditores } from "../../_lib/wiki.js";

export async function onRequestGet({ request, env }) {
  const g = await guarda(request, env, "adm");
  if (g.resp) return g.resp;
  return json({ editores: await listarEditores(env.DB) });
}

export async function onRequestPost({ request, env }) {
  const g = await guarda(request, env, "adm");
  if (g.resp) return g.resp;
  const b = await lerJson(request);
  if (!b || !String(b.usuario || "").trim()) return errorJson("Informe o nome da conta.", 400);
  const u = await findUserByRef(env.DB, b.usuario);
  if (!u) return errorJson("Não existe uma conta com esse nome.", 404);
  if (await isSiteAdmin(env.DB, u)) return errorJson(`>>${u.username} já é ADM do site e pode editar sem autorização.`, 409);
  if (await limitar(env.DB, g.w, "wiki_editores", 40, 3600000)) return errorJson("Limite atingido. Tente mais tarde.", 429);
  const ja = await env.DB.prepare("SELECT 1 AS ok FROM wiki_editores WHERE user_id = ?").bind(u.id).first();
  if (ja) return errorJson(`>>${u.username} já pode editar a wiki.`, 409);
  await env.DB.prepare("INSERT INTO wiki_editores (user_id, concedido_por, concedido_por_nome, concedido_em) VALUES (?, ?, ?, ?)")
    .bind(u.id, g.w.autorId, g.w.autor || "ADM", new Date().toISOString())
    .run();
  return json({ ok: true, username: u.username, editores: await listarEditores(env.DB) }, 201);
}
