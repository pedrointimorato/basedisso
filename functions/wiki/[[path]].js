// Wiki dinâmica (MOR-46): /wiki/, /wiki/<pagina>/, /wiki/<pagina>/editar/, /wiki/<pagina>/historico/[<versao>/],
// /wiki/nova/, /wiki/recentes/, /wiki/editores/. Arquivos estáticos (wiki.css, wiki.js, wiki-editor.js) passam direto.
import {
  wikiContext, negar, listarPaginas, getPagina, getRevisao, listarRevisoes, revisaoAnterior,
  mudancasRecentes, listarEditores, REV_RE, SLUG_RE,
} from "../_lib/wiki.js";
import { renderMarkdown } from "../_lib/wiki-md.js";
import {
  htmlResp, moldura, navHtml, cartoesHtml, paginaArtigo, editorArtigo, avisoArtigo, historicoArtigo,
  revisaoArtigo, recentesArtigo, editoresArtigo, agrupar,
} from "../_lib/wiki-shell.js";

const TITULO = (t) => `${t} — Wiki — basedisso`;

function redirect(url, to) {
  return new Response(null, { status: 308, headers: { Location: new URL(to, url).toString(), "Cache-Control": "no-store" } });
}

async function carregar(env, w) {
  try {
    return await listarPaginas(env.DB, { ocultas: w.editor });
  } catch {
    return null;
  }
}

function pagina(w, paginas, atual, titulo, artigo, status = 200, extra = {}) {
  return htmlResp(
    moldura({ titulo: TITULO(titulo), descricao: extra.descricao || "", nav: navHtml(paginas, atual, w), artigo, editor: Boolean(extra.editor) }),
    status
  );
}

function naoEncontrada(w, paginas) {
  return pagina(w, paginas, "", "Página não encontrada", avisoArtigo("Página não encontrada", "Não existe uma página da wiki com esse endereço.", `<p><a class="wiki-btn" href="/wiki/">Voltar ao início da wiki</a></p>`), 404);
}

function semPermissao(w, paginas, neg) {
  return pagina(w, paginas, "", neg.status === 401 ? "Entre para editar" : "Sem permissão", avisoArtigo(neg.status === 401 ? "Entre na sua conta" : "Sem permissão", neg.erro, `<p><a class="wiki-btn" href="/wiki/">Voltar à wiki</a></p>`), neg.status);
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const partes = Array.isArray(params.path) ? params.path.filter(Boolean) : params.path ? [String(params.path)] : [];

  // arquivos estáticos da pasta /wiki (wiki.css, wiki.js...): têm ponto no nome
  if (partes.some((p) => p.includes("."))) return context.next();
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Método não permitido", { status: 405, headers: { Allow: "GET, HEAD" } });
  }
  if (!env.DB) return context.next();

  // URLs sempre com barra no final
  if (partes.length && !url.pathname.endsWith("/")) return redirect(request.url, url.pathname + "/" + url.search);

  const w = await wikiContext(request, env);
  const paginas = await carregar(env, w);
  if (!paginas) return htmlResp("<!DOCTYPE html><meta charset=utf-8><title>Wiki</title><p>A wiki está indisponível no momento.</p>", 503);

  const [a, b, c] = partes;

  // ---- páginas fixas ----
  if (a === "recentes" && partes.length === 1) {
    const muds = await mudancasRecentes(env.DB, w.editor);
    return pagina(w, paginas, ":recentes", "Mudanças recentes", recentesArtigo(muds), 200, { descricao: "Últimas edições da wiki." });
  }
  if (a === "nova" && partes.length === 1) {
    const neg = negar(w, "adm");
    if (neg) return semPermissao(w, paginas, neg);
    const grupos = agrupar(paginas).map((g) => g.nome);
    return pagina(w, paginas, ":nova", "Nova página", editorArtigo({ modo: "nova", grupos, w }), 200, { editor: true });
  }
  if (a === "editores" && partes.length === 1) {
    const neg = negar(w, "adm");
    if (neg) return semPermissao(w, paginas, neg);
    return pagina(w, paginas, ":editores", "Quem pode editar", editoresArtigo(await listarEditores(env.DB)), 200, { editor: true });
  }

  // ---- página da wiki ----
  const slug = a ? a : "index";
  if (a === "index" && partes.length === 1) return redirect(request.url, "/wiki/");
  if (partes.length > 3 || (a && !SLUG_RE.test(a))) return naoEncontrada(w, paginas);
  const p = await getPagina(env.DB, slug);
  if (!p || (p.oculta && !w.editor)) return naoEncontrada(w, paginas);

  if (partes.length <= 1) {
    const { html, headings } = renderMarkdown(p.corpo, { cartoes: slug === "index" ? cartoesHtml(paginas) : "" });
    return pagina(w, paginas, slug, slug === "index" ? "Wiki" : p.titulo, paginaArtigo(p, paginas, w, html, headings), 200, { descricao: p.resumo, editor: w.editor });
  }

  if (b === "editar" && partes.length === 2) {
    const neg = negar(w, "editor");
    if (neg) return semPermissao(w, paginas, neg);
    const grupos = agrupar(paginas).map((g) => g.nome);
    return pagina(w, paginas, slug, `Editando ${p.titulo}`, editorArtigo({ modo: "editar", p, grupos, w, base: p.rev_id }), 200, { editor: true });
  }

  if (b === "historico") {
    const revs = await listarRevisoes(env.DB, slug);
    if (partes.length === 2) {
      return pagina(w, paginas, slug, `Histórico de ${p.titulo}`, historicoArtigo(p, revs, w), 200, { editor: w.adm });
    }
    if (!REV_RE.test(c)) return naoEncontrada(w, paginas);
    const rev = await getRevisao(env.DB, slug, c);
    if (!rev) return naoEncontrada(w, paginas);
    const ant = await revisaoAnterior(env.DB, slug, rev);
    return pagina(w, paginas, slug, `Versão de ${p.titulo}`, revisaoArtigo(p, rev, ant, w, paginas), 200, { editor: w.adm });
  }

  return naoEncontrada(w, paginas);
}
