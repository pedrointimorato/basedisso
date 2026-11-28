// MOR-43: feed da página inicial — literatura, catálogo em grade das b/, postagens de perfil.
(function () {
  "use strict";

  function el(tag, attrs) {
    var node = document.createElement(tag);
    var key, val, i, child;
    attrs = attrs || {};
    for (key in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, key)) continue;
      val = attrs[key];
      if (val == null || val === false) continue;
      if (key === "class") node.className = val;
      else if (key === "html") node.innerHTML = val;
      else node.setAttribute(key, val);
    }
    for (i = 2; i < arguments.length; i++) {
      child = arguments[i];
      if (child == null || child === false) continue;
      if (typeof child === "string" || typeof child === "number") node.appendChild(document.createTextNode(String(child)));
      else node.appendChild(child);
    }
    return node;
  }

  function rel(iso) {
    if (window.BDAccount && window.BDAccount.relativeTime) return window.BDAccount.relativeTime(iso);
    var t = Date.parse(iso);
    if (Number.isNaN(t)) return "";
    var sec = Math.round((Date.now() - t) / 1000);
    if (sec < 45) return "há poucos segundos";
    var min = Math.round(sec / 60);
    if (min < 60) return min === 1 ? "há 1 minuto" : "há " + min + " minutos";
    var hr = Math.round(min / 60);
    if (hr < 24) return hr === 1 ? "há 1 hora" : "há " + hr + " horas";
    var day = Math.round(hr / 24);
    if (day < 30) return day === 1 ? "há 1 dia" : "há " + day + " dias";
    try { return new Date(t).toLocaleDateString("pt-BR"); } catch (e) { return iso; }
  }

  function fitScale(arte) {
    var lines = String(arte || "").split("\n"), cols = 1;
    lines.forEach(function (l) { cols = Math.max(cols, Array.from(l).length); });
    return Math.max(0.3, Math.min(1.1, (34 - 6) / (cols * 6.02), (30 - 6) / (Math.max(1, lines.length) * 11))).toFixed(3);
  }

  function bIcon(slug, av) {
    if (window.BDBAvatar) return window.BDBAvatar.icon(slug, av, "mini");
    var cls = "or-b-icon or-b-icon-mini";
    if (!av || !av.arte) return el("span", { class: cls + " or-b-tile", "aria-hidden": "true" }, "b");
    var pre = el("span", { class: "av-pre" });
    if (window.BDAccount && window.BDAccount.colorize) window.BDAccount.colorize(pre, av.arte, av.cores || null);
    else pre.textContent = av.arte;
    return el("span", { class: cls + " ascii-avatar", "aria-hidden": "true", style: "--av-scale:" + fitScale(av.arte) }, pre);
  }

  function green(node, text) {
    if (window.BDAccount && window.BDAccount.appendGreen) return window.BDAccount.appendGreen(node, text);
    node.appendChild(document.createTextNode(text || ""));
    return node;
  }

  function commentsLabel(n) {
    n = Number(n || 0);
    return n === 1 ? "1 comentário" : n + " comentários";
  }

  function litCard(item) {
    var a = el("a", { class: "feed-card inicio-lit-card", href: item.href || "/l/" });
    a.appendChild(el("img", { class: "inicio-lit-cover", src: "/l/biblia-amarela-capa.jpg", alt: "", loading: "lazy" }));
    a.appendChild(el("div", { class: "card-body" },
      el("span", { class: "card-badge" }, "literatura"),
      el("h3", { class: "card-title" }, item.titulo || "literatura da comunidade"),
      item.subtitulo ? el("p", { class: "card-text" }, item.subtitulo) : null,
      el("span", { class: "read-more" }, "ler na literatura da comunidade")));
    return a;
  }

  function bCard(p) {
    var href = p.url || ("/b/" + p.community + "/p/" + p.id);
    var mid = p.midia;
    var card = el("a", { class: "feed-card inicio-b-card", href: href, "data-post-id": p.id });
    card.appendChild(el("div", { class: "inicio-b-head" },
      el("span", { class: "inicio-b-av" }, bIcon(p.community, p.avatar)),
      el("span", { class: "inicio-b-nome" }, p.community || "")));
    var main = el("div", { class: "inicio-b-main" });
    if (mid && mid.miniatura) {
      var thumb = el("div", { class: "inicio-b-thumb" });
      thumb.appendChild(el("img", { src: mid.miniatura, alt: "", loading: "lazy", decoding: "async" }));
      if (mid.tipo === "video") thumb.appendChild(el("span", { class: "inicio-b-play", "aria-hidden": "true" }, "▶"));
      main.appendChild(thumb);
    }
    main.appendChild(el("div", { class: "inicio-b-text" },
      el("h3", { class: "card-title" }, p.title || "Sem título"),
      p.excerpt ? el("p", { class: "card-text" }, p.excerpt) : null,
      el("div", { class: "inicio-b-foot" }, commentsLabel(p.comment_count))));
    card.appendChild(main);
    return card;
  }

  function perfilCard(p) {
    var u = p.usuario || {};
    var href = p.url || (u.username ? "/@" + u.username + "#pp-" + p.id : "/");
    var av = (u.avatar && window.BDAccount && window.BDAccount.avatarNode) ? window.BDAccount.avatarNode(u, "xs") : el("span", { class: "card-avatar" }, (u.username || "?").charAt(0).toUpperCase());
    var name = el("a", { class: "card-author", href: u.username ? "/@" + u.username : href }, u.username ? ">>" + u.username : "perfil");
    var body = green(el("p", { class: "card-text" }), p.body || "");
    var media = null;
    if (p.midia && window.BDMidia) media = window.BDMidia.node(p.midia);
    var art = el("article", { class: "feed-card card-texto inicio-perfil-card", "data-pp-id": p.id },
      el("div", { class: "card-header" }, av, el("div", { class: "card-meta" }, name, el("span", { class: "card-time" }, rel(p.created_at))), el("span", { class: "card-badge" }, "perfil")),
      el("div", { class: "card-body" }, body, media),
      el("div", { class: "card-actions" }, el("a", { class: "card-action", href: href }, "ver no perfil")));
    return art;
  }

  function section(title, extra, children, emptyText) {
    var sec = el("section", { class: "inicio-sec" }, el("h2", { class: "inicio-sec-h" }, title, extra || null));
    if (!children || !children.length) {
      sec.appendChild(el("p", { class: "inicio-vazio" }, emptyText));
      return sec;
    }
    children.forEach(function (c) { sec.appendChild(c); });
    return sec;
  }

  function render(host, data) {
    while (host.firstChild) host.removeChild(host.firstChild);
    var lit = data.literatura || [];
    var grade = (data.grade_b && data.grade_b.postagens) || [];
    var perfil = data.perfil || [];

    if (lit.length) {
      var wrap = el("div", { class: "inicio-lit" });
      lit.forEach(function (x) { wrap.appendChild(litCard(x)); });
      host.appendChild(section("literatura da comunidade", el("a", { href: "/l/" }, "abrir a estante"), [wrap]));
    }

    var gwrap = el("div", { class: "inicio-b-grid" });
    grade.forEach(function (p) { gwrap.appendChild(bCard(p)); });
    host.appendChild(section("nas b/", el("a", { href: "/b/todas/" }, "todas as postagens"),
      grade.length ? [gwrap] : null,
      "Ainda não há postagens nas comunidades. "));
    if (!grade.length) {
      var ev = host.querySelector(".inicio-sec:last-child .inicio-vazio");
      if (ev) ev.appendChild(el("a", { href: "/b/" }, "Ver as comunidades"));
    }

    var pwrap = el("div", { class: "inicio-perfil" });
    perfil.forEach(function (p) { pwrap.appendChild(perfilCard(p)); });
    host.appendChild(section("nos perfis", null,
      perfil.length ? [pwrap] : null,
      "Nenhuma postagem de perfil ainda. Entre na sua conta e escreva no seu perfil para aparecer aqui."));

    if (!lit.length && !grade.length && !perfil.length) {
      host.insertBefore(el("p", { class: "inicio-vazio" }, "O feed ainda está vazio."), host.firstChild);
    }
  }

  function start() {
    var host = document.getElementById("inicio-feed");
    if (!host) return;
    fetch("/api/inicio", { headers: { Accept: "application/json" }, credentials: "same-origin" })
      .then(function (r) { return r.json().then(function (d) { return { r: r, d: d }; }); })
      .then(function (out) {
        if (!out.r.ok) {
          host.textContent = "";
          host.appendChild(el("p", { class: "inicio-erro" }, (out.d && out.d.erro) || "Não foi possível carregar o feed."));
          return;
        }
        render(host, out.d);
      })
      .catch(function () {
        host.textContent = "";
        host.appendChild(el("p", { class: "inicio-erro" }, "Falha de rede ao carregar o feed."));
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
