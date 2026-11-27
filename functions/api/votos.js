// POST /api/votos  { tipo: "post"|"comment", id, voto?: 1|-1|0, nota?: 1..5|0 }
// Só contas; um voto e uma nota por conta por item; 0 remove. Devolve o resumo atualizado (servidor manda).
import { countRate, errorJson, isSameOrigin, json, recordRate } from "../_lib/shared.js";
import { getSessionUser } from "../_lib/auth.js";
import { TIPOS, VOTE_RATE_PER_HOUR, VOTE_RATE_PER_MIN, voteSummaries, votableItem } from "../_lib/votos.js";

const ID_RE = /^[0-9a-f-]{8,64}$/i;

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) return errorJson("Serviço indisponível.", 503);
  if (!isSameOrigin(request)) return errorJson("Origem não permitida.", 403);
  const user = await getSessionUser(request, env);
  if (!user) return json({ erro: "Entre na sua conta para votar ou dar nota.", entrar: true }, 401);
  let data;
  try { data = await request.json(); } catch { return errorJson("Pedido inválido.", 400); }
  const tipo = TIPOS[String(data?.tipo || "").toLowerCase()];
  const id = String(data?.id || "");
  if (!tipo || !ID_RE.test(id)) return errorJson("Item inválido.", 400);
  const hasVoto = data && Object.prototype.hasOwnProperty.call(data, "voto");
  const hasNota = data && Object.prototype.hasOwnProperty.call(data, "nota");
  if (hasVoto === hasNota) return errorJson("Envie um voto ou uma nota.", 400);
  const voto = hasVoto ? Number(data.voto) : null;
  const nota = hasNota ? Number(data.nota) : null;
  if (hasVoto && ![-1, 0, 1].includes(voto)) return errorJson("Voto inválido.", 400);
  if (hasNota && !(Number.isInteger(nota) && nota >= 0 && nota <= 5)) return errorJson("Nota inválida (1 a 5).", 400);

  const item = await votableItem(env.DB, tipo, id);
  if (!item) return errorJson(tipo === "post" ? "Postagem não encontrada." : "Comentário não encontrado.", 404);
  if (item.owner && item.owner === user.id) {
    return errorJson(tipo === "post" ? "Você não pode votar na própria postagem." : "Você não pode votar no próprio comentário.", 403);
  }

  const key = "u:" + user.id;
  const now = Date.now();
  if ((await countRate(env.DB, key, "vote", new Date(now - 60000).toISOString())) >= VOTE_RATE_PER_MIN) return errorJson("Muitos votos seguidos. Espere um minuto.", 429);
  if ((await countRate(env.DB, key, "vote", new Date(now - 3600000).toISOString())) >= VOTE_RATE_PER_HOUR) return errorJson("Limite de votos por hora atingido.", 429);

  const iso = new Date().toISOString();
  if (hasVoto) {
    if (voto === 0) await env.DB.prepare("DELETE FROM votes WHERE item_type = ? AND item_id = ? AND user_id = ?").bind(tipo, id, user.id).run();
    else await env.DB.prepare(
      `INSERT INTO votes (item_type, item_id, user_id, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(item_type, item_id, user_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).bind(tipo, id, user.id, voto, iso, iso).run();
  } else {
    if (nota === 0) await env.DB.prepare("DELETE FROM ratings WHERE item_type = ? AND item_id = ? AND user_id = ?").bind(tipo, id, user.id).run();
    else await env.DB.prepare(
      `INSERT INTO ratings (item_type, item_id, user_id, stars, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(item_type, item_id, user_id) DO UPDATE SET stars = excluded.stars, updated_at = excluded.updated_at`
    ).bind(tipo, id, user.id, nota, iso, iso).run();
  }
  await recordRate(env.DB, key, "vote");
  const map = await voteSummaries(env.DB, tipo, [id], user);
  return json({ ok: true, tipo, id, votos: map[id] });
}
