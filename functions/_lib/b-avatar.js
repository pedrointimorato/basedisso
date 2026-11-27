// MOR-39: avatar ASCII das b/. Mesmas regras do avatar de perfil (8 linhas × 16 colunas, cores, até 4 camadas),
// guardado em community_avatar. Sem avatar, o site mostra o "b" laranja de sempre.
import { AVATAR_LIMITS, coloredHtml, layersOut, maskFor } from "./ascii.js";
import { escapeHtml } from "./shared.js";

export const B_AVATAR_LIMITS = AVATAR_LIMITS;
export const B_AVATAR_PER_HOUR = 30;

function out(row) {
  return row && row.art ? { arte: row.art, cores: maskFor(row.art, row.colors), atualizado_em: row.updated_at || null } : null;
}

export async function readCommunityAvatar(db, slug, withLayers = false) {
  if (!db || !slug) return null;
  try {
    const row = await db.prepare("SELECT art, colors, layers, updated_at FROM community_avatar WHERE slug = ?").bind(slug).first();
    const a = out(row);
    if (a && withLayers) a.camadas = layersOut(row);
    return a;
  } catch {
    return null; // tabela ausente em ambiente local
  }
}

// { slug: { arte, cores } } para todas as b/ com avatar (poucas linhas; uma consulta).
export async function communityAvatarMap(db) {
  const m = {};
  if (!db) return m;
  try {
    const { results } = await db.prepare("SELECT slug, art, colors, updated_at FROM community_avatar").all();
    for (const r of results || []) { const a = out(r); if (a) m[r.slug] = { arte: a.arte, cores: a.cores }; }
  } catch { /* tabela ausente */ }
  return m;
}

// Escala que faz a arte caber no quadro (desenho a 10px; ~0,602em por coluna, 1,1em por linha).
// Artes pequenas ficam maiores (até 1,1×); um avatar cheio de 16×8 fica na mesma escala dos perfis.
export function fitScale(arte, w, h) {
  const lines = String(arte || "").split("\n");
  const cols = Math.max(1, ...lines.map((l) => Array.from(l).length));
  const sx = (w - 6) / (cols * 6.02), sy = (h - 6) / (Math.max(1, lines.length) * 11);
  return Math.max(0.3, Math.min(1.1, sx, sy)).toFixed(3);
}

// Cabeçalho da b/: avatar no lugar do "b" laranja (mesmo link e rótulo). Texto sempre escapado; cor só por classe ac-1..8.
export function communitySnooHtml(slug, href, avatar) {
  const s = escapeHtml(slug), h = escapeHtml(href);
  if (!avatar || !avatar.arte) return `<a class="or-snoo" href="${h}" aria-label="b/${s}" data-b-ssr>b</a>`;
  return `<a class="or-snoo or-snoo-art ascii-avatar ascii-avatar-b" href="${h}" aria-label="b/${s}" data-b-avatar="${s}" data-b-ssr style="--av-scale:${fitScale(avatar.arte, 64, 60)}"><span class="av-pre" aria-hidden="true">${coloredHtml(avatar.arte, avatar.cores, escapeHtml)}</span></a>`;
}
