import { escapeHtml } from "../../../_lib/shared.js";
import { SIDEBAR, V } from "../../../_lib/page-shell.js";
import { getCommunityDb, communityHref, postHref, publicPost, UUID_RE } from "../../../_lib/comunidades.js";
import { getVisiblePost } from "../../../_lib/posts.js";

function relativeOrIso(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return escapeHtml(iso);
  }
}

function authorHtml(post) {
  if (post.usuario && post.usuario.username) {
    const name = escapeHtml(post.usuario.username);
    return `<a href="/@${name}" class="or-author user-mention">&gt;&gt;${name}</a>`;
  }
  return `<span class="or-author">${escapeHtml(post.name || "anônimo")}</span>`;
}

function domainOf(link) {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function postPageHtml({ community, post }) {
  const slug = community.slug;
  const title = escapeHtml(post.title || "Postagem");
  const commName = escapeHtml(community.name);
  const hrefComm = communityHref(slug);
  const hrefPost = postHref(slug, post.id);
  const pageKey = `/b/${slug}/p/${post.id}`;
  const body = escapeHtml(post.body || "");
  const link = post.link ? escapeHtml(post.link) : "";
  const domain = post.link ? escapeHtml(domainOf(post.link)) : "";
  const when = escapeHtml(relativeOrIso(post.created_at));

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} — b/${escapeHtml(slug)} — basedisso</title>
    <link rel="stylesheet" href="/style.css?v=20261123c">
    <link rel="stylesheet" href="/account.css?v=20261123c">
    <link rel="stylesheet" href="/b/comunidades.css?v=${V}">
    <link rel="stylesheet" href="/comments.css?v=20261123f">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <div class="site-container layout-default" id="siteContainer">
        <div class="left-area">
            <nav class="navbar">
                <div class="nav-container">
                    <form class="nav-search-box" action="/busca" method="get" role="search">
                        <button type="submit" class="nav-search-submit" aria-label="Buscar"><i class="fa-solid fa-magnifying-glass"></i></button>
                        <input type="search" name="q" class="nav-search-input" placeholder="base de busca" autocomplete="off" enterkeyhint="search">
                    </form>
                    <div class="nav-icons">
                        <a href="/" class="nav-icon-link"><i class="fa-solid fa-house"></i></a>
                        <a href="/s/" class="nav-icon-link"><span class="nav-letter-icon">S</span></a>
                        <a href="/f/" class="nav-icon-link"><span class="icon-gear-wrench"><i class="fa-solid fa-gear"></i><i class="fa-solid fa-wrench"></i></span></a>
                        <a href="/b/" class="nav-icon-link active" title="Comunidades" aria-label="Comunidades"><i class="fa-solid fa-users"></i></a>
                    </div>
                    <div class="nav-right">
                        <button class="btn-toggle-sidebar" id="sidebar-toggle" onclick="toggleSidebarMobile()">
        <i class="fa-solid fa-sliders"></i></button>
                    </div>
                </div>
            </nav>
            <main class="main-content adm-main">
                <div class="oldreddit">
                    <header class="or-header">
                        <div class="or-sr-bar">basedisso &nbsp;·&nbsp; <a href="/b/">comunidades</a> &nbsp;·&nbsp; <a href="${hrefComm}">b/${escapeHtml(slug)}</a></div>
                        <div class="or-header-main">
                            <a class="or-snoo" href="${hrefComm}" aria-label="b/${escapeHtml(slug)}">b</a>
                            <h1 class="or-pagename"><a href="${hrefComm}">${commName}</a></h1>
                            <ul class="or-tabmenu">
                                <li><a href="${hrefComm}">links</a></li>
                                <li class="selected"><a href="${hrefPost}">comentários</a></li>
                                <li><a href="${hrefComm}#criar">criar</a></li>
                            </ul>
                        </div>
                    </header>
                    <div class="or-wrap">
                        <div class="or-listing">
                            <p class="or-back"><a href="${hrefComm}">← b/${escapeHtml(slug)}</a></p>
                            <article class="or-selfpost" id="post">
                                <h2 class="or-selfpost-title">${title}</h2>
                                <p class="or-tagline">enviado ${when} por ${authorHtml(post)}</p>
                                ${link ? `<p class="or-post-link"><a href="${link}" rel="noopener noreferrer">${link}</a>${domain ? ` <span class="or-domain">(${domain})</span>` : ""}</p>` : ""}
                                ${body ? `<div class="or-md or-post-body">${body}</div>` : ""}
                                <div class="bd-comments bd-comments-reddit" id="comentarios" data-page="${escapeHtml(pageKey)}" data-title="Comentários"></div>
                            </article>
                        </div>
                        <aside class="or-side">
                            <div class="or-titlebox">
                                <h2 class="or-side-name">${commName}</h2>
                                <p class="or-side-meta">b/${escapeHtml(slug)}</p>
                                <div class="or-md">
                                    <p>${escapeHtml(community.description)}</p>
                                    <p><a href="${hrefComm}">voltar à comunidade</a> · <a href="/b/">painel</a></p>
                                </div>
                            </div>
                            <div class="or-modbox" data-community-adms="${escapeHtml(slug)}">
                                <h3>moderação</h3>
                                <p class="or-modlist" data-adms-list>carregando…</p>
                                <p><a href="/b/membros/">&gt;&gt;&gt; membros e ADMs da base</a></p>
                            </div>
                        </aside>
                    </div>
                </div>
            </main>
        </div>
        ${SIDEBAR}
    </div>
    <script src="/script.js?v=20261123c"></script>
    <script src="/b/comunidades-ui.js?v=20261123c"></script>
    <script src="/b/base.js?v=${V}"></script>
    <script src="/account.js?v=20261123c"></script>
    <script src="/comments.js?v=20261123f"></script>
</body>
</html>`;
}

export async function onRequestGet(context) {
  const { env, params } = context;
  const community = await getCommunityDb(env.DB, params.comunidade);
  const id = params.id || "";
  if (!community || !UUID_RE.test(id)) {
    return new Response("Página não encontrada.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  if (!env.DB) {
    return new Response("Serviço de postagens indisponível.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  const row = await getVisiblePost(env.DB, id);
  if (!row || row.hidden || row.community !== community.slug) {
    return new Response("Postagem não encontrada.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  const html = postPageHtml({ community, post: publicPost(row) });
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
