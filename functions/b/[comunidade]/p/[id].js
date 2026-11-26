import { escapeHtml } from "../../../_lib/shared.js";
import { SIDEBAR, V, communityCardHtml } from "../../../_lib/page-shell.js";
import { communityCard, getCommunityDb, communityHref, postHref, publicPost, UUID_RE } from "../../../_lib/comunidades.js";
import { getVisiblePost } from "../../../_lib/posts.js";
import { localTimeHtml } from "../../../_lib/hora.js";
import { getSessionUser } from "../../../_lib/auth.js";
import { canModerate, getAdminContext } from "../../../_lib/admins.js";

function authorHtml(post) {
  if (post.usuario && post.usuario.username) {
    const name = escapeHtml(post.usuario.username);
    const av = post.usuario.avatar
      ? `<a href="/@${name}" class="ascii-avatar ascii-avatar-sm" aria-hidden="true" tabindex="-1"><span class="av-pre">${escapeHtml(post.usuario.avatar)}</span></a>`
      : "";
    return `${av}<a href="/@${name}" class="or-author user-mention">&gt;&gt;${name}</a>`;
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

export function postPageHtml({ community, post, proprio = false, podeFixar = false }) {
  const excluida = Boolean(post.excluida_pelo_autor);
  const slug = community.slug;
  const title = excluida ? "Postagem excluída pelo autor" : escapeHtml(post.title || "Postagem");
  const commName = escapeHtml(community.name);
  const hrefComm = communityHref(slug);
  const hrefPost = postHref(slug, post.id);
  const pageKey = `/b/${slug}/p/${post.id}`;
  const body = escapeHtml(post.body || "");
  const link = post.link ? escapeHtml(post.link) : "";
  const domain = post.link ? escapeHtml(domainOf(post.link)) : "";
  const when = localTimeHtml(post.created_at);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} — b/${escapeHtml(slug)} — basedisso</title>
    <link rel="stylesheet" href="/style.css?v=20261123c">
    <link rel="stylesheet" href="/account.css?v=20261126b">
    <link rel="stylesheet" href="/b/comunidades.css?v=${V}">
    <link rel="stylesheet" href="/comments.css?v=20261126d">
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
                            <div class="or-head-actions" data-comm-join="${escapeHtml(slug)}">
                                <a class="or-members-link" href="/b/membros/?b=${escapeHtml(slug)}" title="Membros e ADMs de b/${escapeHtml(slug)}">&gt;&gt;&gt;</a>
                                <button type="button" class="or-join-btn" data-comm-join-btn aria-pressed="false">unir-se</button>
                            </div>
                            <ul class="or-tabmenu">
                                <li><a href="${hrefComm}">links</a></li>
                                <li><a href="${hrefComm}?sort=novos">novos</a></li>
                                <li><a href="${hrefComm}?sort=melhores">melhores</a></li>
                                <li class="selected"><a href="${hrefPost}">comentários</a></li>
                            </ul>
                        </div>
                    </header>
                    <p class="or-join-msg" data-comm-join-msg role="status" hidden></p>
                    <div class="or-wrap">
                        <div class="or-listing">
                            <p class="or-back"><a href="${hrefComm}">← b/${escapeHtml(slug)}</a></p>
                            <article class="or-selfpost" id="post">
                                ${excluida
                                  ? `<h2 class="or-selfpost-title or-excluida">Postagem excluída pelo autor</h2>
                                <p class="or-excluida-nota" data-post-excluida>O título, o texto e o autor foram removidos. Os comentários abaixo continuam legíveis, mas não é mais possível comentar.</p>`
                                  : `<h2 class="or-selfpost-title">${title}</h2>
                                <p class="or-tagline${post.usuario && post.usuario.avatar ? " has-avatar" : ""}">${post.fixado ? '<span class="or-sticky-tag or-fixado-tag" title="fixado por um ADM"><i class="fa-solid fa-thumbtack" aria-hidden="true"></i> fixado</span>' : ""}enviado ${when} por ${authorHtml(post)}</p>
                                ${link ? `<p class="or-post-link"><a href="${link}" rel="noopener noreferrer">${link}</a>${domain ? ` <span class="or-domain">(${domain})</span>` : ""}</p>` : ""}
                                ${body ? `<div class="or-md or-post-body">${body}</div>` : ""}
                                ${proprio || podeFixar ? `<ul class="or-buttons or-own-actions">${proprio ? `<li><button type="button" class="or-excluir" data-excluir-post="${escapeHtml(post.id)}" data-voltar="${hrefComm}">excluir</button></li>` : ""}${podeFixar ? `<li><button type="button" class="or-fixar" data-fixar-post="${escapeHtml(post.id)}" data-fixado="${post.fixado ? "1" : "0"}">${post.fixado ? "desafixar" : "fixar"}</button></li>` : ""}</ul><p class="or-excluir-msg" role="status" hidden></p>` : ""}`}
                                <div class="bd-comments bd-comments-reddit" id="comentarios" data-page="${escapeHtml(pageKey)}" data-title="Comentários"${excluida ? ' data-closed="true"' : ""}></div>
                            </article>
                        </div>
                        <aside class="or-side">
                            ${communityCardHtml(communityCard(community), `<a href="${hrefComm}">voltar à comunidade</a> · <a href="/b/">todas as comunidades</a>`)}
                            <div class="or-modbox" data-community-adms="${escapeHtml(slug)}">
                                <h3>moderação</h3>
                                <p class="or-modlist" data-adms-list>carregando…</p>
                                <p class="or-modcount" data-members-count></p>
                                <p><a href="/b/membros/?b=${escapeHtml(slug)}">&gt;&gt;&gt; membros e ADMs</a></p>
                            </div>
                        </aside>
                    </div>
                </div>
            </main>
        </div>
        ${SIDEBAR}
    </div>
    <script src="/hora-local.js?v=20261126a"></script>
    <script src="/b/excluir-post.js?v=20261126d"></script>
    <script src="/script.js?v=20261123c"></script>
    <script src="/b/comunidades-ui.js?v=${V}"></script>
    <script src="/b/base.js?v=${V}"></script>
    <script src="/account.js?v=20261126b"></script>
    <script src="/comments.js?v=20261126d"></script>
</body>
</html>`;
}

export async function onRequestGet(context) {
  const { env, params, request } = context;
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
  const viewer = await getSessionUser(request, env);
  const proprio = Boolean(viewer && row.user_id && row.user_id === viewer.id && !row.author_deleted_at);
  let podeFixar = false;
  if (!row.author_deleted_at && request.headers.get("Cookie")) {
    const ctx = await getAdminContext(request, env);
    podeFixar = ctx.any && canModerate(ctx, community.slug);
  }
  const html = postPageHtml({ community, post: publicPost(row), proprio, podeFixar });
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
