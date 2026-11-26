// Enquete no post (modelo 1).
// Regras: 2–6 opções (até 80 caracteres), prazo 1h/24h/3d/7d; voto só com conta, 1 por conta, sem troca;
// conta com 3+ dias (primordiais e ADMs do site/da comunidade isentos).
// Resultado: depois de votar, depois de encerrar, ou para o autor do post e ADMs (site ou da b/).
import { canModerate } from "./admins.js";

export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 6;
export const POLL_LABEL_MAX = 80;
export const POLL_MIN_ACCOUNT_AGE_MS = 3 * 24 * 3600 * 1000;
export const POLL_DURATIONS = { "1h": 3600e3, "24h": 24 * 3600e3, "3d": 3 * 24 * 3600e3, "7d": 7 * 24 * 3600e3 };

export function cleanLabel(raw) {
  return String(raw ?? "")
    .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// null = sem enquete; { erro } = inválida; { opcoes, prazo, ms } = ok.
export function cleanPollInput(raw) {
  if (raw == null || raw === false) return null;
  if (typeof raw !== "object") return { erro: "Enquete inválida." };
  const list = Array.isArray(raw.opcoes) ? raw.opcoes : [];
  if (list.length > 20) return { erro: "Opções demais." };
  const opcoes = [];
  const seen = new Set();
  for (const item of list) {
    const label = cleanLabel(item);
    if (!label) continue;
    if (label.length > POLL_LABEL_MAX) return { erro: `Cada opção pode ter até ${POLL_LABEL_MAX} caracteres.` };
    const key = label.toLowerCase();
    if (seen.has(key)) return { erro: "Há opções repetidas na enquete." };
    seen.add(key);
    opcoes.push(label);
  }
  if (opcoes.length < POLL_MIN_OPTIONS) return { erro: `A enquete precisa de pelo menos ${POLL_MIN_OPTIONS} opções.` };
  if (opcoes.length > POLL_MAX_OPTIONS) return { erro: `A enquete pode ter no máximo ${POLL_MAX_OPTIONS} opções.` };
  const prazo = String(raw.prazo || "");
  if (!Object.prototype.hasOwnProperty.call(POLL_DURATIONS, prazo)) return { erro: "Escolha o prazo da enquete (1h, 24h, 3 dias ou 7 dias)." };
  return { opcoes, prazo, ms: POLL_DURATIONS[prazo] };
}

export function pollStatements(db, postId, poll, createdAt) {
  const closes = new Date(Date.parse(createdAt) + poll.ms).toISOString();
  const st = [db.prepare("INSERT INTO polls (post_id, closes_at, created_at) VALUES (?, ?, ?)").bind(postId, closes, createdAt)];
  poll.opcoes.forEach((label, i) => {
    st.push(db.prepare("INSERT INTO poll_options (id, post_id, position, label) VALUES (?, ?, ?, ?)").bind(crypto.randomUUID(), postId, i, label));
  });
  return st;
}

export function deletePollStatements(db, postId) {
  return [
    db.prepare("DELETE FROM poll_votes WHERE post_id = ?").bind(postId),
    db.prepare("DELETE FROM poll_options WHERE post_id = ?").bind(postId),
    db.prepare("DELETE FROM polls WHERE post_id = ?").bind(postId),
  ];
}

export async function deletePoll(db, postId) {
  await db.batch(deletePollStatements(db, postId));
}

// Pode votar? (sem olhar se já votou / se encerrou)
export function voteEligibility(user, ctx, slug, now = Date.now()) {
  if (!user) return { ok: false, motivo: "entrar", texto: "Entre na sua conta para votar." };
  const isent = Boolean(user.is_primordial) || Boolean(ctx && (ctx.site || canModerate(ctx, slug)));
  if (isent) return { ok: true };
  const created = Date.parse(user.created_at || "");
  if (!created || now - created < POLL_MIN_ACCOUNT_AGE_MS) {
    const falta = created ? Math.max(0, created + POLL_MIN_ACCOUNT_AGE_MS - now) : POLL_MIN_ACCOUNT_AGE_MS;
    return { ok: false, motivo: "conta_nova", texto: "Contas com menos de 3 dias ainda não votam em enquetes.", libera_em: created ? new Date(created + POLL_MIN_ACCOUNT_AGE_MS).toISOString() : null, falta_ms: falta };
  }
  return { ok: true };
}

// Estado completo para quem está vendo. post = linha de posts; user = sessão (ou null); ctx = getAdminContext.
export async function readPoll(db, post, user, ctx, now = Date.now()) {
  const poll = await db.prepare("SELECT post_id, closes_at, created_at FROM polls WHERE post_id = ?").bind(post.id).first();
  if (!poll) return null;
  const { results: opts } = await db
    .prepare(
      `SELECT o.id, o.label, o.position, (SELECT COUNT(*) FROM poll_votes v WHERE v.option_id = o.id AND v.post_id = o.post_id) AS votos
       FROM poll_options o WHERE o.post_id = ? ORDER BY o.position`
    )
    .bind(post.id)
    .all();
  const total = (opts || []).reduce((s, o) => s + Number(o.votos || 0), 0);
  const mine = user
    ? await db.prepare("SELECT option_id FROM poll_votes WHERE post_id = ? AND user_id = ?").bind(post.id, user.id).first()
    : null;
  const encerrada = Date.parse(poll.closes_at) <= now;
  const autor = Boolean(user && post.user_id && post.user_id === user.id);
  const adm = Boolean(ctx && ctx.any && canModerate(ctx, post.community));
  const mostra = Boolean(mine) || encerrada || autor || adm;
  const elig = voteEligibility(user, ctx, post.community, now);
  let podeVotar = !encerrada && !mine && elig.ok;
  let motivo = null;
  if (encerrada) motivo = { motivo: "encerrada", texto: "Enquete encerrada." };
  else if (mine) motivo = { motivo: "votou", texto: "Você já votou. O voto não pode ser trocado." };
  else if (!elig.ok) motivo = elig;
  return {
    post_id: post.id,
    encerra_em: poll.closes_at,
    criada_em: poll.created_at,
    encerrada,
    total,
    meu_voto: mine ? mine.option_id : null,
    pode_votar: podeVotar,
    motivo,
    mostra_resultado: mostra,
    previa: mostra && !mine && !encerrada ? (adm ? "adm" : "autor") : null,
    opcoes: (opts || []).map((o) => ({ id: o.id, label: o.label, votos: mostra ? Number(o.votos || 0) : null })),
  };
}

// Barra ASCII (█ cheio, ░ vazio).
export function asciiBar(pct, width = 20) {
  const n = Math.max(0, Math.min(width, Math.round((pct / 100) * width)));
  return "█".repeat(n) + "░".repeat(width - n);
}

// Prazo legível ("encerra em 2d 5h", "encerra em 3h 10min", "encerrada").
export function prazoTexto(closesIso, now = Date.now()) {
  const ms = Date.parse(closesIso) - now;
  if (!(ms > 0)) return "encerrada";
  const min = Math.floor(ms / 60000);
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60;
  if (d > 0) return `encerra em ${d}d ${h}h`;
  if (h > 0) return `encerra em ${h}h ${m}min`;
  return `encerra em ${Math.max(1, m)}min`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Postagem visível (não oculta nem excluída) — senão a enquete "some junto".
export async function visiblePost(db, id) {
  if (!UUID_RE.test(String(id || ""))) return null;
  const p = await db.prepare("SELECT id, community, user_id, hidden, author_deleted_at FROM posts WHERE id = ?").bind(id).first();
  if (!p || p.hidden || p.author_deleted_at) return null;
  return p;
}

