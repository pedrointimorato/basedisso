// Conexões sem conta: identificadas só pelo ip_hash salgado (nunca o IP).
// Rótulos curtos por escopo ('site' ou slug da b/): a mesma conexão tem rótulos diferentes em b/ diferentes,
// para que ADMs de b/ não cruzem quem posta sem conta entre comunidades.
import { sha256Hex } from "./shared.js";
import { canModerate } from "./admins.js";

export const BAN_DURATIONS = { "24h": 24 * 3600e3, "7d": 7 * 24 * 3600e3, "30d": 30 * 24 * 3600e3, perm: null };
export const BAN_REASON_MAX = 200;

export function isLoggedOutRow(row) {
  return Boolean(row && !row.user_id && !row.anon_by && row.ip_hash && String(row.ip_hash).length >= 32);
}

export async function connLabel(ipHash, scope) {
  return "conexão #" + (await sha256Hex(`rotulo|${scope}|${ipHash}`)).slice(0, 4);
}

function activeSql() {
  return "(expires_at IS NULL OR expires_at > ?)";
}

// Ban ativo que impede esta conexão de interagir sem conta em slug (ou no site todo).
export async function activeBan(db, ipHash, slug) {
  if (!db || !ipHash) return null;
  const now = new Date().toISOString();
  const scopes = slug ? ["site", String(slug).toLowerCase()] : ["site"];
  const { results } = await db
    .prepare(`SELECT id, scope, expires_at FROM connection_bans WHERE ip_hash = ? AND scope IN (${scopes.map(() => "?").join(",")}) AND ${activeSql()}`)
    .bind(ipHash, ...scopes, now)
    .all();
  const rows = results || [];
  if (!rows.length) return null;
  // O mais restritivo: permanente > mais longo; site antes de b/ em empate.
  rows.sort((a, b) => (a.expires_at == null ? -1 : b.expires_at == null ? 1 : b.expires_at.localeCompare(a.expires_at)) || (a.scope === "site" ? -1 : 1));
  return rows[0];
}

export function fmtBrasilia(iso) {
  try {
    const s = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
    return s.replace(", ", " às ") + " (horário de Brasília)";
  } catch {
    return iso;
  }
}

export function banMessage(ban) {
  const onde = ban.scope === "site" ? "no basedisso" : `em b/${ban.scope}`;
  const ate = ban.expires_at ? ` até ${fmtBrasilia(ban.expires_at)}` : "";
  return `Esta conexão está impedida de interagir sem conta ${onde}${ate}. Entre na sua conta para participar.`;
}

// Anexa item.conexao (rótulo + o que o ADM pode fazer) aos itens sem conta que o ctx modera.
// rows e items na mesma ordem; slugOf(row) dá a b/ do item (ou null).
export async function attachConnections(db, rows, items, ctx, slugOf) {
  if (!db || !ctx || !ctx.any) return items;
  const want = [];
  (rows || []).forEach((r, i) => {
    if (!isLoggedOutRow(r) || r.author_deleted_at) return;
    const slug = slugOf(r);
    const podeB = Boolean(slug && canModerate(ctx, slug));
    if (!ctx.site && !podeB) return;
    want.push({ r, i, slug, podeB });
  });
  if (!want.length) return items;
  const hashes = [...new Set(want.map((w) => w.r.ip_hash))];
  const now = new Date().toISOString();
  const bans = new Map();
  for (let k = 0; k < hashes.length; k += 50) {
    const chunk = hashes.slice(k, k + 50);
    const { results } = await db
      .prepare(`SELECT ip_hash, scope, expires_at FROM connection_bans WHERE ip_hash IN (${chunk.map(() => "?").join(",")}) AND ${activeSql()}`)
      .bind(...chunk, now)
      .all();
    for (const b of results || []) {
      const list = bans.get(b.ip_hash) || [];
      list.push(b);
      bans.set(b.ip_hash, list);
    }
  }
  for (const w of want) {
    const scope = ctx.site ? "site" : w.slug;
    const visiveis = (bans.get(w.r.ip_hash) || []).filter((b) => (ctx.site ? b.scope === "site" || b.scope === w.slug : b.scope === w.slug));
    items[w.i] = {
      ...items[w.i],
      conexao: {
        rotulo: await connLabel(w.r.ip_hash, scope),
        pode_site: Boolean(ctx.site),
        b: w.podeB ? w.slug : null,
        banida: visiveis.map((b) => ({ escopo: b.scope, ate: b.expires_at })),
      },
    };
  }
  return items;
}
