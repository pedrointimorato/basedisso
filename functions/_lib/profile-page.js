import { escapeHtml } from "./shared.js";

export function profilePageHtml({ title, initialPath }) {
  const safeTitle = escapeHtml(title || "perfil — basedisso");
  const safePath = escapeHtml(initialPath || "");
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle}</title>
    <link rel="stylesheet" href="/style.css">
    <link rel="stylesheet" href="/account.css">
    <link rel="stylesheet" href="/comments.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <div class="site-container layout-default">
        <div class="left-area">
            <nav class="navbar">
                <div class="nav-container">
                    <div class="nav-search-box">
                        <i class="fa-solid fa-magnifying-glass"></i>
                        <input type="text" class="nav-search-input" placeholder="base de busca">
                    </div>
                    <div class="nav-icons">
                        <a href="/" class="nav-icon-link"><i class="fa-solid fa-house"></i></a>
                        <a href="/s/" class="nav-icon-link"><span class="nav-letter-icon">S</span></a>
                        <a href="/f/" class="nav-icon-link"><span class="icon-gear-wrench"><i class="fa-solid fa-gear"></i><i class="fa-solid fa-wrench"></i></span></a>
                        <a href="/adm/" class="nav-icon-link"><i class="fa-solid fa-users"></i></a>
                    </div>
                    <div class="nav-right">
                        <div class="nav-account" data-nav-account></div>
                        <button class="btn-add-question">Apoiar</button>
                    </div>
                </div>
            </nav>
            <main class="main-content profile-main">
                <article class="profile-card" id="profile-root" data-path="${safePath}">
                    <p class="profile-status">Carregando perfil…</p>
                </article>
            </main>
        </div>
    </div>
    <script src="/script.js"></script>
    <script src="/account.js"></script>
    <script src="/perfil.js"></script>
</body>
</html>`;
}
