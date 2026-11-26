import { escapeHtml } from "../../../_lib/shared.js";
import { SIDEBAR, V, communityCardHtml } from "../../../_lib/page-shell.js";
import { communityCard, getCommunityDb, communityHref, postHref, publicPost, UUID_RE } from "../../../_lib/comunidades.js";
import { getVisiblePost } from "../../../_lib/posts.js";
import { localTimeHtml } from "../../../_lib/hora.js";
import { getSessionUser } from "../../../_lib/auth.js";
import { imageHtml, imageUrl, imagesInText } from "../../../_lib/imagens.js";
import { readPoll } from "../../../_lib/enquete.js";
import { coloredHtml } from "../../../_lib/ascii.js";
import { pollHtml } from "../../../_lib/enquete-html.js";
import { canModerate, getAdminContext } from "../../../_lib/admins.js";
import { isOwn, realAuthors, withRealAuthor } from "../../../_lib/anonimo.js";

function badgeHtml(u) {
  if (!u) return "";
  let h = "";
  if (u.is_admin) h += ' <span class="user-badge" title="administrador">[M]</span>';
  if (u.is_primordial && u.primordial_n != null) h += ` <span class="user-badge primordial" title="usuário primordial">primordial #${escapeHtml(String(u.primordial_n))}</span>`;
  return h;
}

// Marcas só para quem pode ver: "(você)" para o autor real; "por >>Nome" para ADMs.
function anonExtrasHtml(post) {
  if (!post.anonimo) return "";
  let h = "";
  if (post.proprio) h += ' <span class="bd-anon-voce" title="só você vê esta marca">(você)</span>';
  if (post.autor_real) {
    const r = post.autor_real;
    h += r.username
      ? ` <span class="bd-autor-real" title="autor real — visível só para ADMs">por <a href="/@${escapeHtml(r.username)}" class="user-mention">&gt;&gt;${escapeHtml(r.username)}</a>${badgeHtml(r)}</span>`
      : ' <span class="bd-autor-real" title="autor real — visível só para ADMs">por [conta removida]</span>';
  }
  return h;
}

function authorHtml(post) {
  if (post.usuario && post.usuario.anonimo) {
    return `<a href="/@an%C3%B4nimo" class="or-author user-mention">&gt;&gt;anônimo</a>${badgeHtml(post.usuario)}${anonExtrasHtml(post)}`;
  }
  if (post.usuario && post.usuario.username) {
    const name = escapeHtml(post.usuario.username);
    const av = post.usuario.avatar
      ? `<a href="/@${name}" class="ascii-avatar ascii-avatar-sm" aria-hidden="true" tabindex="-1"><span class="av-pre">${coloredHtml(post.usuario.avatar, post.usuario.avatar_cores, escapeHtml)}</span></a>`
      : "";
    return `${av}<a href="/@${name}" class="or-author user-mention">&gt;&gt;${name}</a>${badgeHtml(post.usuario)}`;
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

export function postPageHtml({ community, post, proprio = false, podeFixar = false, enquete = null }) {
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
  const linkImg = post.link ? imageUrl(post.link) : null;
  const linkImgHtml = linkImg ? `<div class="or-post-image">${imageHtml(linkImg, post.link, "bd-img-full")}</div>` : "";
  const bodyImgs = imagesInText(post.body || "");
  const bodyImgHtml = bodyImgs.length ? `<div class="bd-img-list">${bodyImgs.map((x) => imageHtml(x.src, x.href)).join("")}</div>` : "";
  const hasImgs = Boolean(linkImg || bodyImgs.length);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <script>try{var t=localStorage.getItem("tema");if(t==="dark"||t==="papel")document.documentElement.setAttribute("data-theme",t)}catch(e){}</script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} — b/${escapeHtml(slug)} — basedisso</title>
    <link rel="stylesheet" href="/style.css?v=20261127d">
    <link rel="stylesheet" href="/account.css?v=20261128b">
    <link rel="stylesheet" href="/b/comunidades.css?v=${V}">
    <link rel="stylesheet" href="/comments.css?v=20261127b">
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
                                ${linkImgHtml}
                                ${body ? `<div class="or-md or-post-body">${body}</div>` : ""}
                                ${bodyImgHtml}
                                ${enquete ? pollHtml(enquete) : ""}
                                ${hasImgs ? `<p class="bd-img-toggle-row"><button type="button" class="bd-img-toggle" data-img-toggle="1">ocultar imagens</button></p>` : ""}
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
    <script src="/b/enquete.js?v=20261127a"></script>
    <script src="/b/excluir-post.js?v=20261126d"></script>
    <script src="/script.js?v=20261126g"></script>
    <script src="/b/comunidades-ui.js?v=${V}"></script>
    <script src="/b/base.js?v=${V}"></script>
    <script src="/account.js?v=20261128a"></script>
    <script src="/comments.js?v=20261128a"></script>
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
  const proprio = Boolean(isOwn(row, viewer) && !row.author_deleted_at);
  let podeFixar = false;
  let ctx = null;
  if (viewer) {
    ctx = await getAdminContext(request, env);
    podeFixar = !row.author_deleted_at && ctx.any && canModerate(ctx, community.slug);
  }
  let enquete = null;
  if (!row.author_deleted_at && row.poll_closes_at) {
    try { enquete = await readPoll(env.DB, row, viewer, ctx); } catch { enquete = null; }
  }
  const html = postPageHtml({ community, post: withRealAuthor(publicPost(row, { proprio }), await realAuthors(env.DB, [row], ctx, (r) => r.community)), proprio, podeFixar, enquete });
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
