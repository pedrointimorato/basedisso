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

  // Avatar ASCII (até 8×16) num espaço fixo, como foto de perfil. Só textContent.
  // size: "sm" (comentários/postagens), "xs" (lista de postagens), "lg" (perfil).
  function avatarNode(user, size) {
    var art = user && typeof user.avatar === "string" ? user.avatar : "";
    if (!art) return null;
    // <span> (não <pre>): pode ficar dentro de <p> sem o HTML fechar o parágrafo.
    var pre = document.createElement("span");
    pre.className = "av-pre";
    pre.textContent = art;
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
          el("a", { href: "/convites/", class: "sidebar-link-sutil" }, "Códigos de convite")
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

  global.BDAccount = {
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
    avatarNode: avatarNode,
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
