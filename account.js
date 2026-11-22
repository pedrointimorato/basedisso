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
      } else {
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

  global.BDAccount = {
    el: el,
    me: me,
    userLink: userLink,
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
