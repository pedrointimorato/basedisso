import { escapeHtml } from "../../_lib/shared.js";
import { NAV, SIDEBAR, V, communityCardHtml, headHtml, htmlResponse, notFoundHtml } from "../../_lib/page-shell.js";
import { communityCard, communityHref, getCommunityDb, NEW_SLUG_RE, RESERVED_SLUGS, STATIC_B_DIRS } from "../../_lib/comunidades.js";

export function communityPageHtml(community) {
  const slug = escapeHtml(community.slug);
  const name = escapeHtml(community.name || community.slug);
  const href = escapeHtml(communityHref(community.slug));
  const desc = escapeHtml(community.description || "");
  return `<!DOCTYPE html>
<html lang="pt-BR">
${headHtml(`b/${community.slug} — ${community.name || community.slug} — basedisso`)}
<body>
    <div class="site-container layout-default" id="siteContainer">
        <div class="left-area">
            ${NAV}
            <main class="main-content adm-main">
                <div class="oldreddit">
                    <header class="or-header">
                        <div class="or-sr-bar">basedisso &nbsp;·&nbsp; <a href="/b/">comunidades</a> &nbsp;·&nbsp; <a href="${href}">b/${slug}</a></div>
                        <div class="or-header-main">
                            <a class="or-snoo" href="${href}" aria-label="b/${slug}">b</a>
                            <h1 class="or-pagename"><a href="${href}">${slug}</a></h1>
                            <div class="or-head-actions" data-comm-join="${slug}">
                                <a class="or-members-link" href="/b/membros/?b=${slug}" title="Membros e ADMs de b/${slug}">&gt;&gt;&gt;</a>
                                <button type="button" class="or-join-btn" data-comm-join-btn aria-pressed="false">unir-se</button>
                            </div>
                            <ul class="or-tabmenu">
                                <li class="selected"><a href="${href}" data-sort="links">links</a></li>
                                <li><a href="${href}?sort=novos" data-sort="novos">novos</a></li>
                                <li><a href="${href}?sort=melhores" data-sort="melhores">melhores</a></li>
                            </ul>
                        </div>
                    </header>
                    <p class="or-join-msg" data-comm-join-msg role="status" hidden></p>
                    <div class="or-wrap">
                        <div class="or-listing" id="or-listing">
                        <div class="or-postar-bar">
                            <button type="button" class="or-postar-btn" id="or-postar-btn" aria-expanded="false" aria-controls="criar">[+] postar</button>
                        </div>
                        <section class="or-submit" id="criar" hidden>
                            <h2>Criar postagem</h2>
                            <p class="or-submit-note">Pode postar anônimo ou com um nome opcional. Se estiver em conta, a postagem sai como &gt;&gt;seu nome (ou como &gt;&gt;anônimo, se marcar a caixinha).</p>
                            <form class="or-submit-form" id="bd-post-form" data-community="${slug}">
                                <p class="or-as-user" data-as-user style="display:none"></p>
                                <label data-name-field>Nome (opcional)
                                    <input type="text" name="name" maxlength="80" autocomplete="nickname" placeholder="anônimo">
                                </label>
                                <label>Título
                                    <input type="text" name="title" maxlength="200" required placeholder="Título da postagem">
                                </label>
                                <label>Texto
                                    <textarea name="body" maxlength="2000" rows="5" placeholder="Escreva o texto da postagem."></textarea>
                                </label>
                                <label>Link (opcional)
                                    <input type="url" name="link" maxlength="500" placeholder="https://">
                                </label>
                                <input type="text" name="website" class="bd-hp" tabindex="-1" autocomplete="off" aria-hidden="true">
                                <div class="bd-comments-actions">
                                    <button type="submit">Publicar</button>
                                    <button type="button" class="or-submit-cancel" data-post-cancel>Cancelar</button>
                                    <p class="bd-comments-status" data-post-status role="status"></p>
                                </div>
                            </form>
                        </section>
                        <div id="bd-posts" data-community="${slug}"></div>
                        </div>
                        <aside class="or-side">
                            ${communityCardHtml(communityCard(community), `<a href="/b/">todas as comunidades</a> · <a href="/b/membros/?b=${slug}">membros</a>`)}
                            <div class="or-modbox" data-community-adms="${slug}">
                                <h3>moderação</h3>
                                <p class="or-modlist" data-adms-list>carregando…</p>
                                <p class="or-modcount" data-members-count></p>
                                <p><a href="/b/membros/?b=${slug}">&gt;&gt;&gt; membros e ADMs</a></p>
                            </div>
                        </aside>
                    </div>
                </div>
            </main>
        </div>
        ${SIDEBAR}
    </div>
    <script src="/script.js?v=20261130c"></script>
    <script src="/b/comunidades-ui.js?v=${V}"></script>
    <script src="/hora-local.js?v=20261126a"></script>
    <script src="/b/enquete.js?v=20261127a"></script>
    <script src="/b/comunidade.js?v=${V}"></script>
    <script src="/b/excluir-post.js?v=${V}"></script>
    <script src="/b/base.js?v=${V}"></script>
    <script src="/b/painel.js?v=20261130a"></script>
    <script src="/account.js?v=20261129a"></script>
    <script src="/votos.js?v=20261201b"></script>
    <script src="/comments.js?v=20261201a"></script>
</body>
</html>`;
}

export async function onRequestGet(context) {
  const { env, params, request } = context;
  const raw = String(params.comunidade || "");
  const slug = raw.toLowerCase();
  // Arquivos e pastas estáticas de /b/ (adm, atoa, membros, .css, .js) seguem para os assets.
  if (STATIC_B_DIRS.has(slug) || raw.includes(".") || !NEW_SLUG_RE.test(slug) || RESERVED_SLUGS.has(slug)) {
    return context.next();
  }
  const community = env.DB ? await getCommunityDb(env.DB, slug) : null;
  if (!community) return notFoundHtml("Comunidade não encontrada.");
  const url = new URL(request.url);
  if (raw !== slug || !url.pathname.endsWith("/")) {
    return Response.redirect(new URL(communityHref(slug), url.origin).toString(), 301);
  }
  return htmlResponse(communityPageHtml(community));
}
