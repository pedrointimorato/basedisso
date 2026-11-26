(function (global) {
  "use strict";

  function el(tag, attrs) {
    var node = document.createElement(tag);
    var key, val, i, child;
    attrs = attrs || {};
    for (key in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, key)) continue;
      val = attrs[key];
      if (val == null) continue;
      if (key === "class") node.className = val;
      else if (key === "dataset") {
        for (var d in val) {
          if (Object.prototype.hasOwnProperty.call(val, d)) node.dataset[d] = val[d];
        }
      } else if (key.slice(0, 2) === "on" && typeof val === "function") {
        node.addEventListener(key.slice(2).toLowerCase(), val);
      } else if (key === "href") node.setAttribute("href", val);
      else if (key === "title") node.setAttribute("title", val);
      else if (key === "disabled") node.disabled = !!val;
      else node.setAttribute(key, val);
    }
    for (i = 2; i < arguments.length; i++) {
      child = arguments[i];
      if (child == null || child === false) continue;
      if (typeof child === "string" || typeof child === "number") {
        node.appendChild(document.createTextNode(String(child)));
      } else node.appendChild(child);
    }
    return node;
  }

  function displayName(username) {
    return ">>" + username;
  }

  function profileHref(username) {
    return "/@" + username;
  }

  function badgesFor(user) {
    var nodes = [];
    if (user && user.is_admin) {
      nodes.push(el("span", { class: "user-badge", title: "administrador" }, "[M]"));
    } else if (user && user.b_admin) {
      nodes.push(el("span", { class: "user-badge user-badge-b", title: "ADM de b/" + user.b_admin }, "[b]"));
    }
    if (user && user.is_primordial) {
      var label = user.primordial_n != null ? "primordial #" + user.primordial_n : "primordial";
      nodes.push(el("span", { class: "user-badge primordial", title: "usuário primordial" }, label));
    }
    return nodes;
  }

  function userLink(username, isAdminOrUser, extraClass) {
    var user = null;
    var name = username;
    if (username && typeof username === "object") {
      user = username;
      name = username.username;
      extraClass = isAdminOrUser;
    } else if (isAdminOrUser && typeof isAdminOrUser === "object") {
      user = isAdminOrUser;
    } else {
      user = { username: name, is_admin: !!isAdminOrUser };
    }
    var a = el(
      "a",
      { class: ("user-mention" + (extraClass ? " " + extraClass : "")), href: profileHref(name) },
      displayName(name)
    );
    var badges = badgesFor(user);
    if (!badges.length) return a;
    var wrap = el("span", { class: "user-with-badge" }, a);
    badges.forEach(function (b) { wrap.appendChild(b); });
    return wrap;
  }

  // >>anônimo: marcas privadas. "(você)" só chega para o autor real; "por >>Nome" só chega para ADMs.
  function anonExtras(item) {
    var out = [];
    if (!item || !item.anonimo) return out;
    if (item.proprio) out.push(el("span", { class: "bd-anon-voce", title: "só você vê esta marca" }, "(você)"));
    if (item.autor_real) {
      var r = item.autor_real;
      out.push(el("span", { class: "bd-autor-real", title: "autor real — visível só para ADMs" },
        "por ", r.username ? userLink(r) : "[conta removida]"));
    }
    return out;
  }
  function appendAnonExtras(node, item) {
    anonExtras(item).forEach(function (n) { node.appendChild(document.createTextNode(" ")); node.appendChild(n); });
    return node;
  }

  // Caixinha "como >>anônimo" abaixo da linha "Postar/Comentar como >>Nome".
  function anonCheckbox(verbo) {
    var input = el("input", { type: "checkbox", name: "anonimo", value: "1", "data-anonimo": "1" });
    var label = el("label", { class: "bd-anon-toggle" }, input, " " + (verbo || "publicar") + " como ", el("span", { class: "user-mention" }, ">>anônimo"));
    label.title = "Aparece como >>anônimo para todos. Os ADMs continuam vendo quem publicou.";
    label._input = input;
    return label;
  }

  // ---- Banir conexão (itens sem conta; só ADMs recebem item.conexao do servidor) ----
  var BAN_DUR = [["24h", "24 horas"], ["7d", "7 dias"], ["30d", "30 dias"], ["perm", "permanente"]];
  function fmtAte(iso) {
    if (!iso) return "permanente";
    try { return "até " + new Date(iso).toLocaleString("pt-BR"); } catch (e) { return "até " + iso; }
  }
  function banButton(tipo, id, cx) {
    var b = el("button", { type: "button", class: "bd-ban-btn", "data-banir-conexao": id, "data-tipo": tipo, "data-rotulo": cx.rotulo,
      "data-pode-site": cx.pode_site ? "1" : "0", "data-b": cx.b || "", "data-banida": JSON.stringify(cx.banida || []) },
      "banir conexão" + (cx.banida && cx.banida.length ? " (banida)" : ""));
    return b;
  }
  function openBanDialog(btn) {
    var opts = { id: btn.getAttribute("data-banir-conexao"), tipo: btn.getAttribute("data-tipo"), rotulo: btn.getAttribute("data-rotulo") || "conexão",
      podeSite: btn.getAttribute("data-pode-site") === "1", b: btn.getAttribute("data-b") || "" };
    var banida = [];
    try { banida = JSON.parse(btn.getAttribute("data-banida") || "[]") || []; } catch (e) { banida = []; }
    var old = document.getElementById("bd-ban-dialog");
    if (old) old.parentNode.removeChild(old);
    var status = el("p", { class: "bd-ban-status", role: "status" });
    var scopes = el("fieldset", { class: "bd-ban-scopes" }, el("legend", null, "Onde"));
    var first = true;
    function radio(val, label) {
      var r = el("input", { type: "radio", name: "bd-ban-escopo", value: val });
      if (first) { r.checked = true; first = false; }
      scopes.appendChild(el("label", { class: "bd-ban-opt" }, r, " " + label));
    }
    if (opts.b) radio("b", "só em b/" + opts.b);
    if (opts.podeSite) radio("site", "no site todo");
    var dur = el("select", { name: "duracao", class: "bd-ban-select", id: "bd-ban-duracao" });
    BAN_DUR.forEach(function (d) { dur.appendChild(el("option", { value: d[0] }, d[1])); });
    var motivo = el("input", { type: "text", name: "motivo", maxlength: "200", placeholder: "opcional", class: "bd-ban-motivo", id: "bd-ban-motivo" });
    var ocultar = el("input", { type: "checkbox", name: "ocultar", id: "bd-ban-ocultar" });
    var go = el("button", { type: "button", class: "bd-ban-go", id: "bd-ban-go" }, "Banir conexão");
    var cancel = el("button", { type: "button", class: "bd-ban-cancel" }, "Cancelar");
    var box = el("div", { class: "bd-ban-box", role: "dialog", "aria-modal": "true", "aria-labelledby": "bd-ban-title" },
      el("h2", { id: "bd-ban-title" }, "Banir conexão"),
      el("p", { class: "bd-ban-label" }, el("strong", null, opts.rotulo), " — impede esta conexão de postar e comentar ", el("em", null, "sem conta"), ". Contas nunca são afetadas: quem entrar na conta continua participando."),
      banida.length ? el("p", { class: "bd-ban-ja" }, "Já banida: " + banida.map(function (x) { return (x.escopo === "site" ? "site todo" : "b/" + x.escopo) + " (" + fmtAte(x.ate) + ")"; }).join("; ") + ". Banir de novo substitui o prazo.") : null,
      scopes,
      el("label", { class: "bd-ban-field" }, "Duração", dur),
      el("label", { class: "bd-ban-field" }, "Motivo", motivo),
      el("label", { class: "bd-ban-check" }, ocultar, " ocultar também os itens sem conta dessa conexão (no escopo escolhido; dá para reexibir na moderação)"),
      el("div", { class: "bd-ban-actions" }, go, cancel),
      status);
    var overlay = el("div", { class: "bd-ban-overlay", id: "bd-ban-dialog" }, box);
    function close() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); document.removeEventListener("keydown", onKey); }
    function onKey(ev) { if (ev.key === "Escape") close(); }
    overlay.addEventListener("click", function (ev) { if (ev.target === overlay) close(); });
    document.addEventListener("keydown", onKey);
    cancel.addEventListener("click", close);
    go.addEventListener("click", function () {
      var esc = scopes.querySelector("input:checked");
      go.disabled = true; status.textContent = "Banindo…"; status.className = "bd-ban-status";
      fetch("/api/moderation/conexoes", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ tipo: opts.tipo, id: opts.id, escopo: esc ? esc.value : "b", duracao: dur.value, motivo: motivo.value, ocultar: ocultar.checked }) })
        .then(function (res) { return res.json().catch(function () { return {}; }).then(function (d) { return { res: res, d: d }; }); })
        .then(function (o) {
          if (!o.res.ok) { go.disabled = false; status.textContent = (o.d && o.d.erro) || "Não foi possível banir."; status.className = "bd-ban-status erro"; return; }
          var oc = o.d.ocultados || {};
          status.textContent = o.d.rotulo + " banida " + (o.d.escopo === "site" ? "no site todo" : "em b/" + o.d.escopo) + " (" + fmtAte(o.d.expira_em) + ")." +
            (ocultar.checked ? " Ocultados: " + (oc.postagens || 0) + " postagem(ns), " + (oc.comentarios || 0) + " comentário(s)." : "");
          status.className = "bd-ban-status ok";
          go.style.display = "none"; cancel.textContent = "Fechar";
          btn.textContent = "banir conexão (banida)";
          try { document.dispatchEvent(new CustomEvent("bd-conexao-banida", { detail: { ocultou: ocultar.checked } })); } catch (e) {}
          if (ocultar.checked) cancel.addEventListener("click", function () { location.reload(); });
        })
        .catch(function () { go.disabled = false; status.textContent = "Falha de rede."; status.className = "bd-ban-status erro"; });
    });
    document.body.appendChild(overlay);
    (scopes.querySelector("input:checked") || dur).focus();
  }
  document.addEventListener("click", function (ev) {
    var btn = ev.target && ev.target.closest ? ev.target.closest("[data-banir-conexao]") : null;
    if (!btn) return;
    ev.preventDefault();
    openBanDialog(btn);
  });

  // ---- Turnstile: só nos formulários de quem está sem conta ----
  var TURNSTILE_SITEKEY = "0x4AAAAAAGUg7y8y8hPDor4e";
  var tsLoading = null;
  function loadTurnstile() {
    if (global.turnstile) return Promise.resolve(global.turnstile);
    if (tsLoading) return tsLoading;
    tsLoading = new Promise(function (resolve, reject) {
      global.__bdTurnstileReady = function () { resolve(global.turnstile); };
      var sc = document.createElement("script");
      sc.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__bdTurnstileReady";
      sc.async = true; sc.defer = true;
      sc.onerror = function () { tsLoading = null; reject(new Error("turnstile")); };
      document.head.appendChild(sc);
    });
    return tsLoading;
  }
  function tsTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }
  var tsWidgets = [];
  function turnstileMount(container, action) {
    var w = { id: null, container: container, action: action, active: false };
    function render() {
      loadTurnstile().then(function (ts) {
        if (!w.active) return;
        if (w.id != null) { try { ts.remove(w.id); } catch (e) {} w.id = null; }
        w.id = ts.render(container, { sitekey: TURNSTILE_SITEKEY, action: action, theme: tsTheme(), size: "flexible", language: "pt-br", "refresh-expired": "auto" });
      }).catch(function () {
        container.textContent = "Não foi possível carregar a verificação anti-robô. Recarregue a página ou entre na sua conta.";
      });
    }
    w.show = function () { if (w.active) return; w.active = true; container.hidden = false; render(); };
    w.hide = function () { w.active = false; container.hidden = true; if (w.id != null && global.turnstile) { try { global.turnstile.remove(w.id); } catch (e) {} } w.id = null; };
    w.token = function () { return w.id != null && global.turnstile ? (global.turnstile.getResponse(w.id) || "") : ""; };
    w.reset = function () { if (w.id != null && global.turnstile) { try { global.turnstile.reset(w.id); } catch (e) {} } };
    w.rerender = function () { if (w.active) render(); };
    tsWidgets.push(w);
    return w;
  }
  try {
    new MutationObserver(function () { tsWidgets.forEach(function (w) { w.rerender(); }); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  } catch (e) {}

  // Cores das artes ASCII: máscara com o mesmo formato da arte ('.' = padrão, '1'..'8' = paleta).
  // Junta sequências da mesma cor num só <span class="ac-N"> (texto via textNode, nunca HTML).
  var ASCII_CORES = [
    { c: "1", nome: "vermelho" }, { c: "2", nome: "laranja" }, { c: "3", nome: "amarelo" }, { c: "4", nome: "verde" },
    { c: "5", nome: "ciano" }, { c: "6", nome: "azul" }, { c: "7", nome: "roxo" }, { c: "8", nome: "cinza" },
  ];
  function colorize(node, art, mask) {
    art = String(art || "");
    if (!mask || typeof mask !== "string") { node.appendChild(document.createTextNode(art)); return node; }
    var lines = art.split("\n"), ml = mask.split("\n");
    lines.forEach(function (line, i) {
      if (i) node.appendChild(document.createTextNode("\n"));
      var chars = Array.from(line), m = ml[i] || "", run = "", cur = ".";
      function flush() {
        if (!run) return;
        if (cur === ".") node.appendChild(document.createTextNode(run));
        else { var sp = document.createElement("span"); sp.className = "ac-" + cur; sp.textContent = run; node.appendChild(sp); }
        run = "";
      }
      for (var j = 0; j < chars.length; j++) {
        var c = m.charAt(j);
        if (!/^[1-8]$/.test(c) || /\s/.test(chars[j])) c = ".";
        if (c !== cur) { flush(); cur = c; }
        run += chars[j];
      }
      flush();
    });
    return node;
  }

  // Avatar ASCII (até 8×16) num espaço fixo, como foto de perfil. Só textContent.
  // size: "sm" (comentários/postagens), "xs" (lista de postagens), "lg" (perfil).
  function avatarNode(user, size) {
    var art = user && typeof user.avatar === "string" ? user.avatar : "";
    if (!art) return null;
    // <span> (não <pre>): pode ficar dentro de <p> sem o HTML fechar o parágrafo.
    var pre = document.createElement("span");
    pre.className = "av-pre";
    colorize(pre, art, user.avatar_cores || null);
    var a = el("a", {
      class: "ascii-avatar ascii-avatar-" + (size || "sm"),
      href: profileHref(user.username),
      "aria-hidden": "true",
      tabindex: "-1",
    });
    a.appendChild(pre);
    return a;
  }

  function tokenizeMentions(text) {
    var s = String(text || "");
    var parts = [];
    var re = /(?:^|[^A-Za-z0-9_])>>([A-Za-z0-9_]{3,20})(?![A-Za-z0-9_])|(?:^|[^A-Za-z0-9._])@([A-Za-z0-9_]{3,20})(?![A-Za-z0-9_])/g;
    var last = 0;
    var m;
    while ((m = re.exec(s))) {
      var name = m[1] || m[2];
      var token = m[1] ? ">>" + m[1] : "@" + m[2];
      var start = m.index;
      if (!(m[0].charAt(0) === ">" || m[0].charAt(0) === "@")) {
        start = m.index + 1;
      }
      if (last < start) parts.push({ type: "text", value: s.slice(last, start) });
      parts.push({ type: "mention", name: name, raw: token });
      last = start + token.length;
    }
    if (last < s.length) parts.push({ type: "text", value: s.slice(last) });
    if (!parts.length) parts.push({ type: "text", value: s });
    return parts;
  }

  function appendBodyWithMentions(node, text, mencoes) {
    var map = mencoes || {};
    tokenizeMentions(text).forEach(function (part) {
      if (part.type !== "mention") {
        node.appendChild(document.createTextNode(part.value));
        return;
      }
      var info = map[part.name.toLowerCase()];
      if (!info) {
        node.appendChild(document.createTextNode(part.raw));
        return;
      }
      node.appendChild(userLink(info));
    });
    return node;
  }

  function me() {
    return fetch("/api/auth/me", { credentials: "same-origin", headers: { Accept: "application/json" } })
      .then(function (res) { return res.json(); })
      .then(function (data) { return data && data.usuario ? data.usuario : null; })
      .catch(function () { return null; });
  }

  function logout() {
    fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).finally(function () {
      window.location.reload();
    });
  }

  function fillNav(user) {
    var nodes = document.querySelectorAll("[data-nav-account]");
    for (var i = 0; i < nodes.length; i++) {
      var box = nodes[i];
      while (box.firstChild) box.removeChild(box.firstChild);
      if (user) {
        box.appendChild(userLink(user, "nav-account-link"));
        box.appendChild(el("button", { type: "button", class: "btn-account-sair", onClick: logout }, "Sair"));
      } else {
        box.appendChild(el("a", { href: "/entrar" }, "Entrar"));
        box.appendChild(el("a", { href: "/cadastro", class: "nav-account-cadastro" }, "Cadastrar"));
      }
    }
  }

  function fillSidebarAccount(user) {
    var nodes = document.querySelectorAll("[data-sidebar-account]");
    for (var i = 0; i < nodes.length; i++) {
      var box = nodes[i];
      while (box.firstChild) box.removeChild(box.firstChild);
      if (user) {
        var row = el("div", { class: "sidebar-account-user" },
          userLink(user, "nav-account-link"),
          el("button", { type: "button", class: "btn-account-sair", onClick: logout }, "Sair")
        );
        box.appendChild(row);
        var links = el("div", { class: "sidebar-account-links" },
          el("a", { href: "/convites/", class: "sidebar-link-sutil" }, "Códigos de convite"),
          el("a", { href: "/f/arte.html", class: "sidebar-link-sutil sidebar-link-arte" }, "Arte ASCII")
        );
        if (user.is_site_admin) {
          links.appendChild(el("a", { href: "/b/adm/moderar/", class: "sidebar-link-sutil" }, "Moderação"));
        }
        box.appendChild(links);
      } else {
        box.appendChild(el("p", { class: "sidebar-acesso-label" }, "Acesso sem conta"));
        var actions = el("div", { class: "sidebar-account-actions" },
          el("a", { href: "/entrar", class: "sidebar-btn-entrar" }, "Entrar"),
          el("a", { href: "/cadastro", class: "sidebar-btn-cadastro" }, "Cadastrar")
        );
        box.appendChild(actions);
        box.appendChild(el("div", { class: "sidebar-account-links" },
          el("a", { href: "/f/arte.html", class: "sidebar-link-sutil sidebar-link-arte" }, "Arte ASCII")));
      }
    }
  }

  function fillAccountUI(user) {
    fillNav(user);
    fillSidebarAccount(user);
  }

  function initNav() {
    me().then(fillAccountUI);
  }


  // ---- Imagens por link (espelhado em functions/_lib/imagens.js) ----
  var IMG_MAX = 4;
  var IMG_EXT_RE = /\.(jpe?g|png|gif|webp|avif)$/i;
  var IMG_HOSTS = { "i.imgur.com": 1, "i.redd.it": 1, "pbs.twimg.com": 1 };
  var IMGUR_PAGE_RE = /^\/([A-Za-z0-9]{5,10})(?:\.[a-z0-9]{3,4})?\/?$/;
  var IMG_PREF = "bd_imagens";

  function imageUrl(raw) {
    var s = String(raw == null ? "" : raw).trim();
    if (!s || s.length > 500 || !/^https?:\/\//i.test(s)) return null;
    var u;
    try { u = new URL(s); } catch (e) { return null; }
    if ((u.protocol !== "http:" && u.protocol !== "https:") || u.username || u.password) return null;
    var host = u.hostname.toLowerCase();
    if (host === "imgur.com" || host === "www.imgur.com" || host === "m.imgur.com") {
      var m = u.pathname.match(IMGUR_PAGE_RE);
      return m ? "https://i.imgur.com/" + m[1] + ".jpg" : null;
    }
    if (IMG_HOSTS[host] || IMG_EXT_RE.test(u.pathname)) return u.href;
    return null;
  }

  function imagesInText(text, max) {
    var out = [], seen = {};
    var toks = String(text || "").split(/\s+/);
    for (var i = 0; i < toks.length && out.length < (max || IMG_MAX); i++) {
      var src = imageUrl(toks[i]);
      if (src && !seen[src]) { seen[src] = 1; out.push({ src: src, href: toks[i] }); }
    }
    return out;
  }

  function imagesEnabled() {
    try { return localStorage.getItem(IMG_PREF) !== "off"; } catch (e) { return true; }
  }
  function applyImagePref() {
    document.documentElement.classList.toggle("bd-noimg", !imagesEnabled());
    var btns = document.querySelectorAll("[data-img-toggle]");
    for (var i = 0; i < btns.length; i++) btns[i].textContent = imagesEnabled() ? "ocultar imagens" : "mostrar imagens";
  }
  function setImagesEnabled(on) {
    try { if (on) localStorage.removeItem(IMG_PREF); else localStorage.setItem(IMG_PREF, "off"); } catch (e) {}
    applyImagePref();
  }
  function imageToggle() {
    var b = el("button", { type: "button", class: "bd-img-toggle", "data-img-toggle": "1" }, imagesEnabled() ? "ocultar imagens" : "mostrar imagens");
    return b;
  }

  document.addEventListener("click", function (ev) {
    var b = ev.target && ev.target.closest ? ev.target.closest("[data-img-toggle]") : null;
    if (b) setImagesEnabled(!imagesEnabled());
  });

  // Imagem quebrada: some (o link no texto continua).
  function imgFailed(img) {
    var wrap = img.closest ? img.closest(".bd-img-link, .or-thumb-img") : null;
    if (wrap && wrap.classList.contains("or-thumb-img")) {
      wrap.classList.remove("or-thumb-img");
      img.parentNode.removeChild(img);
      // Miniatura quebrada: tira também o botão de expandir da mesma postagem.
      var thing = wrap.closest(".or-thing");
      var eb = thing && thing.querySelector(".or-expando-btn");
      var ex = thing && thing.querySelector(".or-expando");
      if (eb) eb.parentNode.removeChild(eb);
      if (ex) ex.parentNode.removeChild(ex);
      return;
    }
    if (wrap) { wrap.hidden = true; wrap.classList.add("bd-img-falhou"); }
    else img.hidden = true;
  }
  document.addEventListener("error", function (ev) {
    var t = ev.target;
    if (t && t.tagName === "IMG" && t.classList && t.classList.contains("bd-img")) imgFailed(t);
  }, true);
  function scanBroken() {
    var imgs = document.querySelectorAll("img.bd-img");
    for (var i = 0; i < imgs.length; i++) if (imgs[i].complete && imgs[i].naturalWidth === 0 && imgs[i].getAttribute("src")) imgFailed(imgs[i]);
  }

  function imageNode(src, href, cls) {
    var img = document.createElement("img");
    img.className = "bd-img";
    img.alt = "imagem (abre o original)";
    img.loading = "lazy";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    img.setAttribute("referrerpolicy", "no-referrer");
    img.src = src;
    var a = el("a", { class: "bd-img-link " + (cls || "bd-img-inline"), href: href || src, target: "_blank", rel: "noopener noreferrer nofollow" });
    a.appendChild(img);
    return a;
  }

  // Acrescenta abaixo do texto as imagens soltas (até 4). Devolve quantas.
  function appendImages(node, text, max) {
    var list = imagesInText(text, max);
    if (!list.length) return 0;
    var box = el("div", { class: "bd-img-list" });
    list.forEach(function (x) { box.appendChild(imageNode(x.src, imageUrl(x.href) ? x.href : x.src)); });
    node.appendChild(box);
    return list.length;
  }

  function initImages() { applyImagePref(); scanBroken(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initImages);
  else initImages();

  // <time datetime data-hora-local> no fuso do dispositivo (mesmo formato do /hora-local.js);
  // o texto inicial é UTC, rotulado, caso a formatação falhe.
  function utcText(d) {
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return p(d.getUTCDate()) + "/" + p(d.getUTCMonth() + 1) + "/" + d.getUTCFullYear() + ", " + p(d.getUTCHours()) + ":" + p(d.getUTCMinutes()) + ":" + p(d.getUTCSeconds()) + " UTC";
  }
  function localTimeNode(iso) {
    var d = new Date(iso);
    if (!iso || isNaN(d.getTime())) return document.createTextNode(String(iso || ""));
    var t = el("time", { datetime: d.toISOString(), "data-hora-local": "", title: utcText(d) }, utcText(d));
    try {
      t.textContent = d.toLocaleString("pt-BR");
      t.setAttribute("title", d.toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "long" }));
      t.setAttribute("data-hora-ok", "1");
    } catch (e) { /* fica em UTC */ }
    return t;
  }
  // Mensagem de conexão banida (resposta 403 com banida/escopo/ate) com a hora local.
  function banMessageNode(d) {
    var frag = document.createDocumentFragment();
    if (!d || !d.banida || !d.escopo) { frag.appendChild(document.createTextNode((d && d.erro) || "")); return frag; }
    frag.appendChild(document.createTextNode("Esta conexão está impedida de interagir sem conta " + (d.escopo === "site" ? "no basedisso" : "em b/" + d.escopo)));
    if (d.ate) { frag.appendChild(document.createTextNode(" até ")); frag.appendChild(localTimeNode(d.ate)); }
    else frag.appendChild(document.createTextNode(" permanentemente"));
    frag.appendChild(document.createTextNode(". Entre na sua conta para participar."));
    return frag;
  }
  function showError(node, d, fallback) {
    while (node.firstChild) node.removeChild(node.firstChild);
    if (d && d.banida) node.appendChild(banMessageNode(d));
    else node.textContent = (d && d.erro) || fallback;
  }

  global.BDAccount = {
    localTimeNode: localTimeNode,
    banMessageNode: banMessageNode,
    showError: showError,
    img: {
      MAX: IMG_MAX,
      url: imageUrl,
      inText: imagesInText,
      node: imageNode,
      append: appendImages,
      toggle: imageToggle,
      enabled: imagesEnabled,
      setEnabled: setImagesEnabled,
      scanBroken: scanBroken,
    },
    el: el,
    me: me,
    userLink: userLink,
    anonExtras: anonExtras,
    appendAnonExtras: appendAnonExtras,
    anonCheckbox: anonCheckbox,
    banButton: banButton,
    turnstile: { mount: turnstileMount, load: loadTurnstile },
    avatarNode: avatarNode,
    colorize: colorize,
    asciiCores: ASCII_CORES,
    displayName: displayName,
    profileHref: profileHref,
    appendBodyWithMentions: appendBodyWithMentions,
    tokenizeMentions: tokenizeMentions,
    fillNav: fillNav,
    fillSidebarAccount: fillSidebarAccount,
    fillAccountUI: fillAccountUI,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNav);
  } else {
    initNav();
  }
})(window);
