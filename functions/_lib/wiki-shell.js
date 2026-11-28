// HTML da wiki (MOR-46): mesma moldura das outras páginas do site (barra, lateral, temas).
// Todo texto vindo do banco (títulos, resumos, nomes, corpo) passa por esc(); o corpo da página sai do renderizador seguro.
import { NAV, SIDEBAR } from "./page-shell.js";
import { localTimeHtml } from "./hora.js";
import { esc, renderMarkdown, lineDiff } from "./wiki-md.js";

export const WV = "20261210a";
const NAV_WIKI = NAV.replace('class="nav-icon-link active"', 'class="nav-icon-link"');
const SIDEBAR_WIKI = SIDEBAR.replace('class="sidebar-icon-link sidebar-help-link"', 'class="sidebar-icon-link sidebar-help-link" aria-current="page"');

export function htmlResp(html, status = 200) {
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export function moldura({ titulo, descricao, nav, artigo, editor = false }) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <script>try{var t=localStorage.getItem("tema");if(t==="dark"||t==="papel")document.documentElement.setAttribute("data-theme",t)}catch(e){}</script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(titulo)}</title>
    <meta name="description" content="${esc(descricao || "")}">
    <link rel="stylesheet" href="/style.css?v=20261209a">
    <link rel="stylesheet" href="/account.css?v=20261208a">
    <link rel="stylesheet" href="/comments.css?v=20261127b">
    <link rel="stylesheet" href="/wiki/wiki.css?v=${WV}">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>

    <div class="site-container layout-default" id="siteContainer">

        <div class="left-area">
            ${NAV_WIKI}

            <main class="main-content wiki-page">
                <div class="wiki-layout">
                    <nav class="wiki-nav" aria-label="Índice da wiki">
                        <details open>
                            <summary>Índice da wiki</summary>
                            <div class="wiki-nav-lista">
${nav}
                            </div>
                        </details>
                    </nav>
                    <article class="wiki-doc">
${artigo}
                    </article>
                </div>
            </main>
        </div>

        ${SIDEBAR_WIKI}

    </div>

    <script src="/script.js?v=20261130c"></script>
    <script src="/account.js?v=20261205a"></script>
    <script src="/midia.js?v=20261208a"></script>
    <script src="/etiquetas.js?v=20261202b"></script>
    <script src="/votos.js?v=20261201c"></script>
    <script src="/comments.js?v=20261203a"></script>
    <script src="/hora-local.js?v=20261126a"></script>
    <script src="/wiki/wiki.js?v=${WV}"></script>${editor ? `\n    <script src="/wiki/wiki-editor.js?v=${WV}"></script>` : ""}
</body>
</html>`;
}

const url = (slug) => (slug === "index" ? "/wiki/" : `/wiki/${slug}/`);
export const urlPagina = url;

// Grupos na ordem em que aparecem (pela menor "ordem" de cada grupo).
export function agrupar(paginas) {
  const grupos = [];
  const mapa = new Map();
  for (const p of paginas) {
    if (!mapa.has(p.grupo)) { const g = { nome: p.grupo, itens: [] }; mapa.set(p.grupo, g); grupos.push(g); }
    mapa.get(p.grupo).itens.push(p);
  }
  return grupos;
}

export function navHtml(paginas, atual, w) {
  const out = agrupar(paginas).map((g) => {
    const li = g.itens
      .map((p) => `<li><a href="${url(p.slug)}"${p.slug === atual ? ' aria-current="page"' : ""}>${esc(p.nav)}${p.oculta ? ' <span class="wiki-tag">oculta</span>' : ""}</a></li>`)
      .join("");
    return `<div class="wiki-nav-grupo"><h2>${esc(g.nome)}</h2><ul>${li}</ul></div>`;
  });
  const extra = [`<li><a href="/wiki/recentes/"${atual === ":recentes" ? ' aria-current="page"' : ""}>Mudanças recentes</a></li>`];
  if (w && w.adm) {
    extra.push(`<li><a href="/wiki/nova/"${atual === ":nova" ? ' aria-current="page"' : ""}>Nova página</a></li>`);
    extra.push(`<li><a href="/wiki/editores/"${atual === ":editores" ? ' aria-current="page"' : ""}>Quem pode editar</a></li>`);
  }
  out.push(`<div class="wiki-nav-grupo"><h2>Edição</h2><ul>${extra.join("")}</ul></div>`);
  return out.join("\n");
}

export function cartoesHtml(paginas) {
  const out = [];
  for (const g of agrupar(paginas.filter((p) => p.slug !== "index")).filter((g) => g.nome !== "Visão geral")) {
    out.push(`<h2 class="wiki-grupo-titulo">${esc(g.nome)}</h2><div class="wiki-cards">`);
    for (const p of g.itens) out.push(`<a class="wiki-card" href="${url(p.slug)}"><b>${esc(p.nav)}</b><span>${esc(p.resumo)}</span></a>`);
    out.push("</div>");
  }
  return out.join("\n");
}

function tocHtml(headings) {
  const h2 = headings.filter((h) => h.level === 2);
  if (h2.length < 3) return "";
  return `<div class="wiki-toc"><p>Nesta página</p><ul>${h2.map((h) => `<li><a href="#${esc(h.id)}">${esc(h.text)}</a></li>`).join("")}</ul></div>`;
}

function pagerHtml(paginas, slug) {
  const lista = paginas.filter((p) => p.slug !== "index");
  const i = lista.findIndex((p) => p.slug === slug);
  if (i < 0) return "";
  const ant = i > 0 ? lista[i - 1] : null;
  const prox = i + 1 < lista.length ? lista[i + 1] : null;
  const a = ant ? `<a href="${url(ant.slug)}"><small>Anterior</small>${esc(ant.nav)}</a>` : '<span class="vazio"></span>';
  const b = prox ? `<a class="prox" href="${url(prox.slug)}"><small>Próxima</small>${esc(prox.nav)}</a>` : '<span class="vazio"></span>';
  return `<div class="wiki-pager">${a}${b}</div>`;
}

function acoesHtml(p, w) {
  if (!w.editor) return "";
  const b = [`<a class="wiki-btn primario" href="/wiki/${esc(p.slug)}/editar/" data-wiki-editar><i class="fa-solid fa-pen"></i> Editar</a>`, `<a class="wiki-btn" href="/wiki/${esc(p.slug)}/historico/">Histórico</a>`];
  if (w.adm && p.slug !== "index") {
    b.push(`<button type="button" class="wiki-btn" data-wiki-ocultar="${p.oculta ? "0" : "1"}" data-slug="${esc(p.slug)}">${p.oculta ? "Mostrar página" : "Ocultar página"}</button>`);
    if (p.oculta) b.push(`<button type="button" class="wiki-btn perigo" data-wiki-apagar data-slug="${esc(p.slug)}">Apagar página</button>`);
  }
  return `<div class="wiki-acoes" role="group" aria-label="Edição">${b.join("")}</div>`;
}

export function paginaArtigo(p, paginas, w, corpoHtml, headings) {
  const crumb = p.slug !== "index" ? `<p class="wiki-crumb"><a href="/wiki/">Wiki</a> › ${esc(p.nav)}</p>` : "";
  const aviso = p.oculta ? `<p class="wiki-banner">Esta página está <b>oculta</b>: só ADMs e editores a veem.</p>` : "";
  return `${crumb}
<h1>${esc(p.titulo)}</h1>
<p class="wiki-resumo">${esc(p.resumo)}</p>
${aviso}${acoesHtml(p, w)}
${p.slug !== "index" ? tocHtml(headings) : ""}
${corpoHtml}
${p.slug !== "index" ? pagerHtml(paginas, p.slug) : ""}
<p class="wiki-rodape">Wiki do basedisso · atualizada em ${localTimeHtml(p.atualizado_em)} · <a href="/wiki/${esc(p.slug === "index" ? "index" : p.slug)}/historico/">histórico de edições</a> · <a href="/wiki/recentes/">mudanças recentes</a>. Achou algo errado ou faltando? Avise pela aba ADM ou em <a href="/b/adm/">b/adm</a>.</p>`;
}

const AJUDA = `<details class="wiki-ajuda"><summary>Guia de marcação</summary>
<div class="wiki-tabela"><table><thead><tr><th>Para fazer</th><th>Escreva</th></tr></thead><tbody>
<tr><td>Título de seção / subseção</td><td><code>## Título</code> · <code>### Subtítulo</code></td></tr>
<tr><td>Negrito, itálico</td><td><code>**negrito**</code> · <code>*itálico*</code></td></tr>
<tr><td>Código</td><td><code>\`código\`</code></td></tr>
<tr><td>Link</td><td><code>[texto](/wiki/regras/)</code> ou <code>[texto](https://exemplo.com)</code></td></tr>
<tr><td>Lista</td><td><code>- item</code> · <code>1. item</code> (recue 2 espaços para subitens)</td></tr>
<tr><td>Tabela</td><td><code>| A | B |</code> e, na linha de baixo, <code>|---|---|</code></td></tr>
<tr><td>Quadro de aviso</td><td><code>::: nota</code> ou <code>::: importante</code> … <code>:::</code></td></tr>
<tr><td>Exemplo com greentext</td><td><code>::: demo</code> … <code>:::</code></td></tr>
<tr><td>Perguntas e respostas</td><td><code>::: faq</code> com <code>##</code> dentro … <code>:::</code></td></tr>
<tr><td>Bloco de código</td><td>três crases <code>\`\`\`</code> antes e depois</td></tr>
<tr><td>Linha separadora</td><td><code>---</code></td></tr>
</tbody></table></div>
<p>HTML não funciona: tudo o que for digitado aparece como texto. Links só aceitam <code>http(s)://</code>, endereços do site (começando com <code>/</code>), <code>#âncora</code> e <code>mailto:</code>.</p></details>`;

export function editorArtigo({ modo, p, grupos, w, base }) {
  const nova = modo === "nova";
  const v = p || { slug: "", titulo: "", nav: "", grupo: grupos[0] || "Como funciona", resumo: "", ordem: 0, corpo: "" };
  const titulo = nova ? "Nova página" : `Editando: ${esc(v.titulo)}`;
  const crumb = nova ? `<p class="wiki-crumb"><a href="/wiki/">Wiki</a> › Nova página</p>` : `<p class="wiki-crumb"><a href="/wiki/">Wiki</a> › <a href="${url(v.slug)}">${esc(v.nav)}</a> › Editar</p>`;
  const dl = grupos.map((g) => `<option value="${esc(g)}"></option>`).join("");
  const admCampos = w.adm
    ? `<div class="wiki-campos-linha">
        <label>Grupo no menu <input type="text" name="grupo" maxlength="40" list="wiki-grupos" value="${esc(v.grupo)}" autocomplete="off"></label>
        <datalist id="wiki-grupos">${dl}</datalist>
        <label>Ordem no menu <input type="number" name="ordem" min="0" max="9999" step="1" value="${nova ? "" : esc(v.ordem)}" placeholder="${nova ? "no fim" : ""}"></label>
      </div>`
    : "";
  const slugCampo = nova
    ? `<label>Endereço (<code>/wiki/…/</code>) <input type="text" name="slug" maxlength="40" required pattern="[a-z0-9-]+" placeholder="ex.: denuncias" autocomplete="off"><small>3 a 40 caracteres: letras minúsculas sem acento, números e hífens. Não dá para mudar depois.</small></label>`
    : "";
  return `${crumb}
<h1>${titulo}</h1>
<form class="wiki-form" id="wiki-form" data-modo="${nova ? "nova" : "editar"}" data-slug="${esc(v.slug)}" data-base="${esc(base || "")}" autocomplete="off" novalidate>
  ${slugCampo}
  <label>Título <input type="text" name="titulo" maxlength="120" required value="${esc(v.titulo)}"></label>
  <div class="wiki-campos-linha">
    <label>Nome no menu <input type="text" name="nav" maxlength="60" value="${esc(v.nav)}"></label>
  </div>
  ${admCampos}
  <label>Resumo (aparece abaixo do título e nos cartões) <textarea name="resumo" rows="2" maxlength="400">${esc(v.resumo)}</textarea></label>
  <div class="wiki-abas" role="tablist" aria-label="Texto da página">
    <button type="button" role="tab" class="wiki-aba ativa" data-wiki-aba="escrever" aria-selected="true">Escrever</button>
    <button type="button" role="tab" class="wiki-aba" data-wiki-aba="ver" aria-selected="false">Visualizar</button>
  </div>
  <textarea name="corpo" id="wiki-corpo" class="wiki-corpo" rows="22" maxlength="60000" spellcheck="true" required>${esc(v.corpo)}</textarea>
  <div class="wiki-doc wiki-previa" id="wiki-previa" hidden></div>
  ${AJUDA}
  <label>Resumo da edição (o que mudou e por quê) <input type="text" name="resumo_edicao" maxlength="200" placeholder="${nova ? "Página criada" : "ex.: corrigi o limite de caracteres"}"></label>
  <div class="wiki-form-botoes">
    <button type="submit" class="wiki-btn primario" id="wiki-salvar">${nova ? "Criar página" : "Salvar alterações"}</button>
    <a class="wiki-btn" href="${nova ? "/wiki/" : url(v.slug)}" id="wiki-cancelar">Cancelar</a>
    <span class="wiki-status" id="wiki-status" role="status" aria-live="polite"></span>
  </div>
</form>`;
}

export function avisoArtigo(titulo, msg, extra = "") {
  return `<p class="wiki-crumb"><a href="/wiki/">Wiki</a></p><h1>${esc(titulo)}</h1><p class="wiki-resumo">${esc(msg)}</p>${extra}`;
}

const TIPO_ROTULO = { criacao: "criação", edicao: "edição", reversao: "reversão", ocultar: "ocultada", mostrar: "reexibida" };

function autorHtml(nome) {
  const n = String(nome || "");
  return /^[A-Za-z0-9_]{3,20}$/.test(n) && n !== "ADM" ? `<a href="/@${esc(n)}">&gt;&gt;${esc(n)}</a>` : esc(n || "?");
}

export function historicoArtigo(p, revs, w) {
  const linhas = revs
    .map((r, i) => {
      const atual = r.id === p.rev_id;
      const prev = revs[i + 1];
      const delta = prev ? r.tamanho - prev.tamanho : r.tamanho;
      const dTxt = prev ? (delta > 0 ? `+${delta}` : String(delta)) : `${delta}`;
      const cls = !prev ? "" : delta > 0 ? "mais" : delta < 0 ? "menos" : "";
      const acoes = [`<a href="/wiki/${esc(p.slug)}/historico/${esc(r.id)}/">ver</a>`];
      if (w.adm && !atual && (r.tipo === "criacao" || r.tipo === "edicao" || r.tipo === "reversao" || r.tipo === "ocultar" || r.tipo === "mostrar")) {
        acoes.push(`<button type="button" class="wiki-link-btn" data-wiki-reverter="${esc(r.id)}" data-slug="${esc(p.slug)}">reverter para esta</button>`);
      }
      return `<tr${atual ? ' class="atual"' : ""}>
<td data-r="quando">${localTimeHtml(r.criado_em)}${atual ? ' <span class="wiki-tag">atual</span>' : ""}</td>
<td data-r="quem">${autorHtml(r.autor_nome)}</td>
<td data-r="tipo">${esc(TIPO_ROTULO[r.tipo] || r.tipo)}</td>
<td data-r="resumo">${r.resumo_edicao ? esc(r.resumo_edicao) : '<i class="wiki-vazio">sem resumo</i>'}</td>
<td data-r="tam" class="${cls}">${esc(dTxt)}</td>
<td data-r="acoes">${acoes.join(" · ")}</td></tr>`;
    })
    .join("\n");
  return `<p class="wiki-crumb"><a href="/wiki/">Wiki</a> › <a href="${url(p.slug)}">${esc(p.nav)}</a> › Histórico</p>
<h1>Histórico: ${esc(p.titulo)}</h1>
<p class="wiki-resumo">Cada salvamento cria uma versão. ${w.adm ? "Como ADM, você pode reverter a página para uma versão antiga (isso cria uma nova versão)." : "Qualquer pessoa pode ler as versões antigas."}</p>
<div class="wiki-tabela wiki-historico"><table>
<thead><tr><th>Quando</th><th>Quem</th><th class="col-tipo">Tipo</th><th>Resumo</th><th>Caracteres</th><th></th></tr></thead>
<tbody>
${linhas}
</tbody></table></div>
<p class="wiki-status" id="wiki-status" role="status" aria-live="polite"></p>`;
}

function diffHtml(a, b) {
  const ops = lineDiff(a, b);
  if (!ops) return `<p class="wiki-vazio">A diferença é grande demais para mostrar linha a linha.</p>`;
  if (!ops.some((o) => o.t !== "=")) return `<p class="wiki-vazio">O texto não mudou.</p>`;
  const CTX = 2;
  const keep = new Array(ops.length).fill(false);
  ops.forEach((o, i) => { if (o.t !== "=") for (let k = Math.max(0, i - CTX); k <= Math.min(ops.length - 1, i + CTX); k++) keep[k] = true; });
  const out = [];
  let omit = 0;
  ops.forEach((o, i) => {
    if (!keep[i]) { omit++; return; }
    if (omit) { out.push(`<div class="d-omite">… ${omit} linha${omit > 1 ? "s" : ""} sem mudança …</div>`); omit = 0; }
    const sinal = o.t === "+" ? "+" : o.t === "-" ? "−" : " ";
    out.push(`<div class="d-linha ${o.t === "+" ? "d-add" : o.t === "-" ? "d-del" : "d-igual"}"><span class="d-sinal" aria-hidden="true">${sinal}</span><span class="d-txt">${esc(o.s) || "&nbsp;"}</span></div>`);
  });
  if (omit) out.push(`<div class="d-omite">… ${omit} linha${omit > 1 ? "s" : ""} sem mudança …</div>`);
  return `<div class="wiki-diff" role="group" aria-label="Diferenças">${out.join("")}</div>`;
}

export function revisaoArtigo(p, rev, ant, w, paginas) {
  const atual = rev.id === p.rev_id;
  const metas = [];
  for (const [k, rot] of [["titulo", "Título"], ["nav", "Nome no menu"], ["resumo", "Resumo"], ["grupo", "Grupo"], ["ordem", "Ordem"]]) {
    const novo = String(rev[k] ?? ""), velho = ant ? String(ant[k] ?? "") : null;
    if (velho !== null && velho !== novo) metas.push(`<li><b>${rot}:</b> <del>${esc(velho)}</del> → <ins>${esc(novo)}</ins></li>`);
  }
  const corpoHtml = renderMarkdown(rev.corpo, { cartoes: rev.slug === "index" ? cartoesHtml(paginas) : "" }).html;
  const botoes = w.adm && !atual
    ? `<div class="wiki-acoes"><button type="button" class="wiki-btn" data-wiki-reverter="${esc(rev.id)}" data-slug="${esc(p.slug)}">Reverter a página para esta versão</button></div>`
    : "";
  return `<p class="wiki-crumb"><a href="/wiki/">Wiki</a> › <a href="${url(p.slug)}">${esc(p.nav)}</a> › <a href="/wiki/${esc(p.slug)}/historico/">Histórico</a> › Versão</p>
<h1>${esc(rev.titulo)}</h1>
<p class="wiki-banner">Versão de ${localTimeHtml(rev.criado_em)} por ${autorHtml(rev.autor_nome)} (${esc(TIPO_ROTULO[rev.tipo] || rev.tipo)})${rev.resumo_edicao ? `: ${esc(rev.resumo_edicao)}` : ""}. ${atual ? "<b>É a versão atual.</b>" : `Não é a versão atual. <a href="${url(p.slug)}">Ver a atual</a>.`}</p>
${botoes}
<h2 class="wiki-sub">O que mudou nesta versão</h2>
${ant ? `${metas.length ? `<ul class="wiki-metas">${metas.join("")}</ul>` : ""}${diffHtml(ant.corpo, rev.corpo)}` : `<p class="wiki-vazio">Primeira versão da página.</p>`}
<h2 class="wiki-sub">Como a página ficou</h2>
<div class="wiki-versao">${corpoHtml}</div>
<p class="wiki-status" id="wiki-status" role="status" aria-live="polite"></p>`;
}

export function recentesArtigo(muds) {
  const li = muds
    .map(
      (m) => `<tr><td data-r="quando">${localTimeHtml(m.criado_em)}</td><td data-r="pagina"><a href="${url(m.slug)}">${esc(m.titulo)}</a></td><td data-r="quem">${autorHtml(m.autor_nome)}</td><td data-r="tipo">${esc(TIPO_ROTULO[m.tipo] || m.tipo)}</td><td data-r="resumo">${m.resumo_edicao ? esc(m.resumo_edicao) : '<i class="wiki-vazio">sem resumo</i>'}</td><td><a href="/wiki/${esc(m.slug)}/historico/${esc(m.id)}/">ver</a></td></tr>`
    )
    .join("\n");
  return `<p class="wiki-crumb"><a href="/wiki/">Wiki</a> › Mudanças recentes</p>
<h1>Mudanças recentes</h1>
<p class="wiki-resumo">As últimas edições feitas na wiki, de todas as páginas.</p>
<div class="wiki-tabela wiki-historico"><table><thead><tr><th>Quando</th><th>Página</th><th>Quem</th><th class="col-tipo">Tipo</th><th>Resumo</th><th></th></tr></thead><tbody>
${li}
</tbody></table></div>`;
}

export function editoresArtigo(editores) {
  const li = editores.length
    ? editores
        .map(
          (e) => `<li data-editor="${esc(e.username)}"><span class="wiki-editor-nome"><a href="/@${esc(e.username)}">&gt;&gt;${esc(e.username)}</a></span><span class="wiki-editor-info">autorizado em ${localTimeHtml(e.concedido_em)}${e.concedido_por_nome ? ` por ${esc(e.concedido_por_nome)}` : ""}</span><button type="button" class="wiki-btn perigo" data-wiki-revogar="${esc(e.username)}">Revogar</button></li>`
        )
        .join("\n")
    : `<li class="wiki-vazio" data-vazio>Nenhuma conta autorizada além dos ADMs.</li>`;
  return `<p class="wiki-crumb"><a href="/wiki/">Wiki</a> › Quem pode editar</p>
<h1>Quem pode editar a wiki</h1>
<p class="wiki-resumo">ADMs do site editam sempre e são os únicos que gerenciam esta lista. Contas autorizadas aqui podem editar o texto das páginas existentes, mas não criar, apagar, ocultar, reverter versões nem mexer em quem edita.</p>
<form class="wiki-form wiki-form-linha" id="wiki-editores-form" autocomplete="off">
  <label>Conta (<code>&gt;&gt;Nome</code> ou <code>@Nome</code>) <input type="text" name="usuario" maxlength="30" required placeholder="Nome da conta"></label>
  <button type="submit" class="wiki-btn primario">Autorizar</button>
</form>
<p class="wiki-status" id="wiki-status" role="status" aria-live="polite"></p>
<h2 class="wiki-sub">Editores autorizados</h2>
<ul class="wiki-editores" id="wiki-editores-lista">
${li}
</ul>`;
}
