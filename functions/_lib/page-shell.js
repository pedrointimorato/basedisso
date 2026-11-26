import { escapeHtml } from "./shared.js";

export const V = "20261126e";

export const SIDEBAR = `<aside class="right-sidebar">
            <div class="sidebar-header">
                <h2 id="sidebar-tab-title"><a href="/" class="nav-logo">basedisso</a></h2>
                <button type="button" class="btn-add-question sidebar-btn-apoiar">Apoiar</button>
                <a href="#" class="sidebar-icon-link"><h1><i class="fa-solid fa-plus"></i></h1></a>
                <button class="btn-close-sidebar" onclick="toggleSidebarMobile()">&times;</button>
                <a href="#" class="sidebar-icon-link sidebar-help-link"><h1><i class="fa-regular fa-circle-question"></i></h1></a>
            </div>
            <div class="sidebar-body">
                <div class="sidebar-tab-content active" id="tab-meu">
                    <div class="sidebar-block sidebar-account-block">
                        <div class="sidebar-account" data-sidebar-account></div>
                    </div>
                </div>
                <div class="sidebar-tab-content" id="tab-configuracoes">
                    <div class="sidebar-block">
                        <h3>Preferências do Sistema</h3>
                        <div class="config-options">
                            <label class="config-item">
                                <span>Modo Escuro</span>
                                <input type="checkbox" id="theme-toggle">
                            </label>
                            <label class="config-item">
                                <span>Notificações por Email</span>
                                <input type="checkbox" checked>
                            </label>
                            <label class="config-item">
                                <span>Navegação Compacta</span>
                                <input type="checkbox">
                            </label>
                        </div>
                    </div>
                </div>
                <div class="sidebar-tab-content" id="tab-ofertas">
                    <div class="sidebar-block adm-box">
                        <h3>ADM</h3>
                        <p>Alguma queixa, elogio, sugestão ou oferta?<br>
                        Deixe um comentário abaixo ou me envie um e-mail: <a href="mailto:Intimorato@mail.ru">Intimorato@mail.ru</a></p>
                        <a class="btn-adm-page" href="/b/adm/">abrir página do adm</a>
                        <div class="bd-comments bd-comments-sidebar" data-page="/b/adm" data-form-only="true"></div>
                    </div>
                </div>
            </div>
            <footer class="sidebar-footer">
                <button class="footer-tab-btn active" onclick="mudarAbaSidebar('meu', 'Meu', event)">
                    <i class="fa-solid fa-user"></i>
                    <span>Meu</span>
                </button>
                <button class="footer-tab-btn" onclick="mudarAbaSidebar('configuracoes', 'Configurações', event)">
                    <i class="fa-solid fa-sliders"></i>
                    <span>Ajustes</span>
                </button>
                <button class="footer-tab-btn" onclick="mudarAbaSidebar('ofertas', 'ADM', event)">
                    <i class="fa-regular fa-envelope"></i>
                    <span>ADM</span>
                </button>
            </footer>
        </aside>`;

export const NAV = `<nav class="navbar">
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
            </nav>`;

export function headHtml(title) {
  return `<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="/style.css?v=20261123c">
    <link rel="stylesheet" href="/account.css?v=20261126b">
    <link rel="stylesheet" href="/b/comunidades.css?v=${V}">
    <link rel="stylesheet" href="/comments.css?v=20261126f">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>`;
}

export function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export function notFoundHtml(msg = "Página não encontrada.") {
  return htmlResponse(`<!DOCTYPE html><html lang="pt-BR">${headHtml("Não encontrado — basedisso")}<body><div class="site-container layout-default" id="siteContainer"><div class="left-area">${NAV}<main class="main-content adm-main"><div class="oldreddit"><div class="or-wrap"><div class="or-listing"><p>${escapeHtml(msg)}</p><p><a href="/b/">voltar ao painel de comunidades</a></p></div></div></div></main></div>${SIDEBAR}</div><script src="/script.js?v=20261123c"></script><script src="/account.js?v=20261126e"></script><script src="/comments.js?v=20261126e"></script></body></html>`, 404);
}

// Texto de cartão: parágrafos separados por linha em branco, quebras simples como <br>.
export function cardBodyHtml(text) {
  const parts = String(text || "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return parts.map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("\n");
}

export function communityCardHtml(card, linksHtml) {
  const slug = escapeHtml(card.slug);
  return `<div class="or-titlebox" data-card="community" data-card-slug="${slug}">
                                <div class="or-card-head"><h2 class="or-side-name" data-card-title>${escapeHtml(card.title)}</h2><button type="button" class="or-card-edit" data-card-edit hidden>editar</button></div>
                                <p class="or-side-meta" data-card-subtitle>${escapeHtml(card.subtitle || "")}</p>
                                <div class="or-md">
                                    <div class="or-card-body" data-card-body>${cardBodyHtml(card.body)}</div>
                                    <p class="or-card-links">${linksHtml}</p>
                                </div>
                            </div>`;
}
