// Wiki editável (MOR-46): dados em D1 (wiki_paginas, wiki_revisoes, wiki_editores) e regras de permissão.
// Quem edita: ADMs do site (sempre) e contas autorizadas por um ADM (wiki_editores). Quem gerencia: só ADMs do site.
import { getAdminContext } from "./admins.js";
import { countRate, recordRate } from "./shared.js";
import { renderMarkdown } from "./wiki-md.js";

export const LIMITES = { titulo: 120, nav: 60, resumo: 400, grupo: 40, corpo: 60000, resumoEdicao: 200 };
export const RESERVADOS = new Set([
  "index", "editores", "nova", "novo", "recentes", "historico", "editar", "api", "admin", "adm", "wiki", "busca",
  "fonte", "static", "assets", "ajuda", "new", "edit", "history", "null", "undefined",
]);
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
export const REV_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function novoId() {
  return crypto.randomUUID();
}

// ---- permissões ----
export async function wikiContext(request, env) {
  const ctx = await getAdminContext(request, env);
  let editor = false;
  if (ctx.site) editor = true;
  else if (ctx.user && env.DB) {
    const row = await env.DB.prepare("SELECT 1 AS ok FROM wiki_editores WHERE user_id = ?").bind(ctx.user.id).first().catch(() => null);
    editor = Boolean(row);
  }
  return {
    user: ctx.user || null,
    adm: Boolean(ctx.site),
    editor,
    loggedIn: Boolean(ctx.loggedIn),
    autor: ctx.user ? ctx.user.username : ctx.token ? "ADM" : null,
    autorId: ctx.user ? ctx.user.id : null,
    rateKey: ctx.user ? "u:" + ctx.user.id : "tok:adm",
  };
}

// 401 se não entrou, 403 se não pode.
export function negar(w, exige) {
  if (!w.loggedIn) return { status: 401, erro: "Entre na sua conta para editar a wiki." };
  if (exige === "adm" && !w.adm) return { status: 403, erro: "Apenas ADMs do site podem fazer isso." };
  if (exige === "editor" && !w.editor) return { status: 403, erro: "Você não tem permissão para editar a wiki. Peça a um ADM." };
  return null;
}

export async function limitar(db, w, kind, max, janelaMs) {
  const since = new Date(Date.now() - janelaMs).toISOString();
  if ((await countRate(db, w.rateKey, kind, since)) >= max) return true;
  await recordRate(db, w.rateKey, kind);
  return false;
}

// ---- leitura ----
export async function listarPaginas(db, { ocultas = false } = {}) {
  const { results } = await db
    .prepare(
      `SELECT slug, titulo, nav, grupo, resumo, ordem, oculta, atualizado_em FROM wiki_paginas ${ocultas ? "" : "WHERE oculta = 0"} ORDER BY ordem, slug`
    )
    .all();
  return results || [];
}

export async function getPagina(db, slug) {
  return db.prepare("SELECT * FROM wiki_paginas WHERE slug = ?").bind(slug).first();
}

export async function getRevisao(db, slug, id) {
  return db.prepare("SELECT * FROM wiki_revisoes WHERE slug = ? AND id = ?").bind(slug, id).first();
}

export async function listarRevisoes(db, slug, limite = 200) {
  const { results } = await db
    .prepare(
      `SELECT id, slug, tipo, autor_nome, autor_id, resumo_edicao, criado_em, LENGTH(corpo) AS tamanho
         FROM wiki_revisoes WHERE slug = ? ORDER BY criado_em DESC, rowid DESC LIMIT ?`
    )
    .bind(slug, limite)
    .all();
  return results || [];
}

export async function revisaoAnterior(db, slug, rev) {
  return db
    .prepare(
      `SELECT * FROM wiki_revisoes WHERE slug = ? AND (criado_em < ? OR (criado_em = ? AND rowid < (SELECT rowid FROM wiki_revisoes WHERE id = ?)))
        ORDER BY criado_em DESC, rowid DESC LIMIT 1`
    )
    .bind(slug, rev.criado_em, rev.criado_em, rev.id)
    .first();
}

export async function mudancasRecentes(db, ocultas, limite = 60) {
  const { results } = await db
    .prepare(
      `SELECT r.id, r.slug, r.tipo, r.autor_nome, r.resumo_edicao, r.criado_em, p.titulo, p.oculta
         FROM wiki_revisoes r JOIN wiki_paginas p ON p.slug = r.slug
        ${ocultas ? "" : "WHERE p.oculta = 0"} ORDER BY r.criado_em DESC, r.rowid DESC LIMIT ?`
    )
    .bind(limite)
    .all();
  return results || [];
}

export async function listarEditores(db) {
  const { results } = await db
    .prepare(
      `SELECT u.username, e.concedido_em, e.concedido_por_nome FROM wiki_editores e JOIN users u ON u.id = e.user_id ORDER BY e.concedido_em DESC`
    )
    .all();
  return results || [];
}

// ---- validação ----
function limpaLinha(v, max) {
  return String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max + 1);
}
export function limpaCorpo(v) {
  return String(v == null ? "" : v).replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").replace(/\s+$/g, "");
}

// Campos de conteúdo (editor e ADM). Devolve { erro } ou { campos }.
export function validarConteudo(b, atual) {
  const titulo = limpaLinha(b.titulo, LIMITES.titulo);
  const nav = limpaLinha(b.nav, LIMITES.nav) || titulo.slice(0, LIMITES.nav);
  const resumo = limpaLinha(b.resumo, LIMITES.resumo);
  const corpo = limpaCorpo(b.corpo);
  if (!titulo) return { erro: "Escreva o título da página." };
  if (titulo.length > LIMITES.titulo) return { erro: `O título pode ter até ${LIMITES.titulo} caracteres.` };
  if (nav.length > LIMITES.nav) return { erro: `O nome no menu pode ter até ${LIMITES.nav} caracteres.` };
  if (resumo.length > LIMITES.resumo) return { erro: `O resumo pode ter até ${LIMITES.resumo} caracteres.` };
  if (!corpo) return { erro: "O texto da página não pode ficar vazio." };
  if (corpo.length > LIMITES.corpo) return { erro: `O texto pode ter até ${LIMITES.corpo.toLocaleString("pt-BR")} caracteres.` };
  return { campos: { titulo, nav, resumo, corpo } };
}

export function validarGrupo(v) {
  const g = limpaLinha(v, LIMITES.grupo);
  if (!g) return { erro: "Escolha um grupo para a página." };
  if (g.length > LIMITES.grupo) return { erro: `O grupo pode ter até ${LIMITES.grupo} caracteres.` };
  return { grupo: g };
}

export function validarResumoEdicao(v) {
  const s = limpaLinha(v, LIMITES.resumoEdicao);
  return s.length > LIMITES.resumoEdicao ? { erro: `O resumo da edição pode ter até ${LIMITES.resumoEdicao} caracteres.` } : { texto: s };
}

export function validarSlug(raw) {
  const s = String(raw == null ? "" : raw).trim().toLowerCase();
  if (!SLUG_RE.test(s)) return { erro: "O endereço deve ter de 3 a 40 caracteres: letras minúsculas sem acento, números e hífens (sem hífen no começo ou no fim)." };
  if (/--/.test(s)) return { erro: "O endereço não pode ter dois hífens seguidos." };
  if (RESERVADOS.has(s)) return { erro: "Esse endereço é reservado. Escolha outro." };
  return { slug: s };
}

// ---- escrita ----
// Cria uma revisão com o retrato completo da página e aponta a página para ela.
export async function gravarRevisao(db, w, pagina, tipo, resumoEdicao, baseRev) {
  const id = novoId();
  const agora = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO wiki_revisoes (id, slug, tipo, titulo, nav, grupo, resumo, ordem, corpo, autor_id, autor_nome, resumo_edicao, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, pagina.slug, tipo, pagina.titulo, pagina.nav, pagina.grupo, pagina.resumo, pagina.ordem, pagina.corpo, w.autorId, w.autor || "ADM", resumoEdicao || "", agora)
    .run();
  const up = await db
    .prepare(
      `UPDATE wiki_paginas SET titulo = ?, nav = ?, grupo = ?, resumo = ?, ordem = ?, corpo = ?, oculta = ?, rev_id = ?, atualizado_em = ?
        WHERE slug = ? AND rev_id = ?`
    )
    .bind(pagina.titulo, pagina.nav, pagina.grupo, pagina.resumo, pagina.ordem, pagina.corpo, pagina.oculta ? 1 : 0, id, agora, pagina.slug, baseRev)
    .run();
  if (!up.meta || up.meta.changes !== 1) {
    await db.prepare("DELETE FROM wiki_revisoes WHERE id = ?").bind(id).run();
    return { conflito: true };
  }
  return { id, criado_em: agora };
}

// ---- renderização de uma página ----
export function renderizarPagina(corpo, cartoesHtml) {
  return renderMarkdown(corpo, { cartoes: cartoesHtml });
}

// ---- helpers das rotas da API ----
import { errorJson, isSameOrigin } from "./shared.js";

export async function lerJson(request) {
  try {
    const t = await request.text();
    if (t.length > 200000) return null;
    const v = JSON.parse(t);
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

// Confere origem, banco e permissão. Devolve { w } ou { resp }.
export async function guarda(request, env, exige) {
  if (!isSameOrigin(request)) return { resp: errorJson("Origem inválida.", 403) };
  if (!env.DB) return { resp: errorJson("Serviço indisponível.", 503) };
  const w = await wikiContext(request, env);
  const neg = negar(w, exige);
  if (neg) return { resp: errorJson(neg.erro, neg.status) };
  return { w };
}
