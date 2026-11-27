// MOR-35: votos (+1/-1) e notas de aplicabilidade (1–5) em postagens e comentários. Só contas.
import { communityOfPage } from "./admins.js";
import { ownerId } from "./anonimo.js";

export const TIPOS = { post: "post", postagem: "post", comment: "comment", comentario: "comment" };
export const VOTE_RATE_PER_MIN = 40;
export const VOTE_RATE_PER_HOUR = 600;

export function emptyVotes() {
  return { score: 0, up: 0, down: 0, meu: 0, nota_media: null, nota_total: 0, minha_nota: 0 };
}

// Resumo de vários itens em 2 consultas (json_each evita o limite de parâmetros e o N+1).
export async function voteSummaries(db, tipo, ids, viewer) {
  const out = {};
  const list = [...new Set((ids || []).filter(Boolean))];
  for (const id of list) out[id] = emptyVotes();
  if (!db || !list.length) return out;
  const uid = viewer && viewer.id ? viewer.id : "";
  const idsJson = JSON.stringify(list);
  try {
    const [v, r] = await db.batch([
      db.prepare(`SELECT item_id, SUM(value) AS score, SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END) AS up,
                         SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END) AS down, MAX(CASE WHEN user_id = ?1 THEN value END) AS meu
                  FROM votes WHERE item_type = ?2 AND item_id IN (SELECT value FROM json_each(?3)) GROUP BY item_id`).bind(uid, tipo, idsJson),
      db.prepare(`SELECT item_id, AVG(stars) AS media, COUNT(*) AS total, MAX(CASE WHEN user_id = ?1 THEN stars END) AS minha
                  FROM ratings WHERE item_type = ?2 AND item_id IN (SELECT value FROM json_each(?3)) GROUP BY item_id`).bind(uid, tipo, idsJson),
    ]);
    for (const row of v.results || []) {
      const o = out[row.item_id]; if (!o) continue;
      o.score = Number(row.score || 0); o.up = Number(row.up || 0); o.down = Number(row.down || 0); o.meu = Number(row.meu || 0);
    }
    for (const row of r.results || []) {
      const o = out[row.item_id]; if (!o) continue;
      o.nota_media = row.media == null ? null : Math.round(Number(row.media) * 10) / 10; o.nota_total = Number(row.total || 0); o.minha_nota = Number(row.minha || 0);
    }
  } catch {
    /* tabelas ainda não criadas: tudo zerado */
  }
  return out;
}

export async function attachVotes(db, tipo, items, viewer) {
  const map = await voteSummaries(db, tipo, (items || []).map((x) => x && x.id), viewer);
  for (const it of items || []) if (it && it.id) it.votos = map[it.id] || emptyVotes();
  return items;
}

// Item votável: visível, não excluído pelo autor. Devolve comunidade e dono (só para uso no servidor).
export async function votableItem(db, tipo, id) {
  if (tipo === "post") {
    const row = await db.prepare("SELECT id, community, user_id, anon_by, hidden, author_deleted_at FROM posts WHERE id = ?").bind(id).first();
    if (!row || row.hidden || row.author_deleted_at) return null;
    return { slug: row.community, owner: ownerId(row) };
  }
  const row = await db.prepare("SELECT id, page, user_id, anon_by, hidden, author_deleted_at, parent_id FROM comments WHERE id = ?").bind(id).first();
  if (!row || row.hidden || row.author_deleted_at) return null;
  return { slug: communityOfPage(row.page), owner: ownerId(row), page: row.page };
}

// Comunidade de um comentário em SQL (mesma regra de communityOfPage).
export const COMMENT_SLUG_SQL = "CASE WHEN c.page = '/b/adm' THEN 'adm' WHEN c.page LIKE '/b/%/p/%' THEN substr(c.page, 4, instr(substr(c.page, 4), '/') - 1) END";
