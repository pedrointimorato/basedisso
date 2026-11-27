import { escapeHtml } from "./shared.js";

export function profilePageHtml({ title, initialPath }) {
  const safeTitle = escapeHtml(title || "perfil — basedisso");
  const safePath = escapeHtml(initialPath || "");
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <script>try{var t=localStorage.getItem("tema");if(t==="dark"||t==="papel")document.documentElement.setAttribute("data-theme",t)}catch(e){}</script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle}</title>
    <link rel="stylesheet" href="/style.css?v=20261127d">
    <link rel="stylesheet" href="/account.css?v=20261130b">
    <link rel="stylesheet" href="/comments.css?v=20261127b">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <div class="site-container layout-default">
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
                        <a href="/b/" class="nav-icon-link" title="Comunidades" aria-label="Comunidades"><i class="fa-solid fa-users"></i></a>
                    </div>
                    <div class="nav-right">
                        <button class="btn-toggle-sidebar" id="sidebar-toggle" onclick="toggleSidebarMobile()">
        <i class="fa-solid fa-sliders"></i></button>
                    </div>
                </div>
            </nav>
            <main class="main-content profile-main">
                <article class="profile-card" id="profile-root" data-path="${safePath}">
                    <p class="profile-status">Carregando perfil…</p>
                </article>
            </main>
        </div>
        <aside class="right-sidebar">
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
                    <div class="sidebar-block tema-block">
                        <h3>Tema</h3>
                        <div class="tema-options" role="group" aria-label="Tema">
                            <label class="tema-item"><span>Escuro</span><input type="checkbox" role="switch" data-tema="dark"><span class="tema-pill" aria-hidden="true"></span></label>
                            <label class="tema-item"><span>Papel</span><input type="checkbox" role="switch" data-tema="papel"><span class="tema-pill" aria-hidden="true"></span></label>
                        </div>
                    </div>
                    <div class="sidebar-block">
                        <h3>Preferências do Sistema</h3>
                        <div class="config-options">
                            <label class="config-item">
                                <span>Notificações por Email</span>
                                <input type="checkbox" checked>
                            </label>
                            <label class="config-item">
                                <span>Navegação Compacta</span>
                                <input type="checkbox" role="switch" data-pref="compacta">
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
        </aside>
    </div>
    <script src="/script.js?v=20261130c"></script>
    <script src="/account.js?v=20261129a"></script>
    <script src="/votos.js?v=20261201c"></script>
    <script src="/comments.js?v=20261201a"></script>
    <script src="/ascii-editor.js?v=20261129b"></script>
    <script src="/perfil.js?v=20261129b"></script>
</body>
</html>`;
}
