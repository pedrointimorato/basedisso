(function () {
  "use strict";

  var PAGE_LABELS = {
    "/adm": { href: "/adm/", label: "página do adm" },
    "/s": { href: "/s/", label: "sátiras" },
    "/s/biblia-amarela": { href: "/s/biblia-amarela.html", label: "A Bíblia Amarela" },
  };

  function el() {
    return window.BDAccount.el.apply(null, arguments);
  }

  function relativeTime(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
    } catch (e) {
      return iso;
    }
  }

  function pageLink(page) {
    var info = PAGE_LABELS[page] || { href: page || "#", label: page || "página" };
    return el("a", { href: info.href }, info.label);
  }

  function render(root, data) {
    while (root.firstChild) root.removeChild(root.firstChild);
    var u = data.usuario;
    if (!u) {
      root.appendChild(el("p", { class: "profile-status erro" }, "Usuário não encontrado."));
      return;
    }
    var name = el("h1", { class: "profile-name" });
    if (window.BDAccount) {
      name.appendChild(window.BDAccount.userLink(u));
    } else {
      name.appendChild(document.createTextNode(">>" + u.username));
    }
    root.appendChild(name);
    if (data.reservado) {
      root.appendChild(el("p", { class: "profile-meta" }, data.mensagem || "Conta reservada."));
      return;
    }
    var meta = "No basedisso desde " + relativeTime(u.created_at);
    if (u.is_admin) meta += " · administrador";
    if (u.is_primordial) meta += u.primordial_n != null ? " · primordial #" + u.primordial_n : " · primordial";
    root.appendChild(el("p", { class: "profile-meta" }, meta));
    var comments = data.comentarios || [];
    root.appendChild(el("h2", { class: "bd-comments-title" }, comments.length ? "Comentários" : "Ainda sem comentários."));
    if (!comments.length) return;
    var list = el("ul", { class: "profile-comments" });
    comments.forEach(function (c) {
      var body = el("p", { class: "profile-comment-body" });
      window.BDAccount.appendBodyWithMentions(body, c.body || "", c.mencoes || {});
      list.appendChild(
        el(
          "li",
          null,
          el("p", { class: "profile-comment-page" }, pageLink(c.page), " · ", c.created_at ? new Date(c.created_at).toLocaleString("pt-BR") : ""),
          body
        )
      );
    });
    root.appendChild(list);
  }

  function init() {
    var root = document.getElementById("profile-root");
    if (!root) return;
    var path = root.getAttribute("data-path") || location.pathname;
    var m = path.match(/^\/@([^/]+)\/?$/);
    if (!m) {
      root.textContent = "Perfil inválido.";
      return;
    }
    var name = decodeURIComponent(m[1]);
    fetch("/api/users/" + encodeURIComponent(name), { headers: { Accept: "application/json" }, credentials: "same-origin" })
      .then(function (res) {
        return res.json().then(function (data) { return { res: res, data: data }; });
      })
      .then(function (out) {
        if (out.res.status === 404) {
          while (root.firstChild) root.removeChild(root.firstChild);
          root.appendChild(el("p", { class: "profile-status erro" }, out.data && out.data.erro ? out.data.erro : "Usuário não encontrado."));
          return;
        }
        if (!out.res.ok) {
          while (root.firstChild) root.removeChild(root.firstChild);
          root.appendChild(el("p", { class: "profile-status erro" }, "Não foi possível carregar o perfil."));
          return;
        }
        render(root, out.data);
        if (out.data.usuario && out.data.usuario.username) {
          document.title = ">>" + out.data.usuario.username + " — basedisso";
        }
      })
      .catch(function () {
        while (root.firstChild) root.removeChild(root.firstChild);
        root.appendChild(el("p", { class: "profile-status erro" }, "Falha de rede ao carregar o perfil."));
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
