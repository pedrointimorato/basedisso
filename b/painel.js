// Painel lateral das b/ no computador: preenche o espaço vazio da coluna da direita com
// postagens recentes das bases e a lista de comunidades. No celular (coluna empilhada) não carrega nada.
(function () {
  "use strict";
  var MQ = "(min-width: 901px)";
  var side = document.querySelector(".oldreddit .or-side");
  if (!side || !window.fetch) return;
  var m = location.pathname.match(/^\/b\/([a-z0-9][a-z0-9_-]{0,23})\//);
  var atual = m && m[1] !== "membros" ? m[1] : null;
  var feito = false;

  function el(tag, attrs) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      n.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
    }
    return n;
  }
  function rel(iso) {
    var t = Date.parse(iso); if (!t) return "";
    var s = Math.max(0, Math.round((Date.now() - t) / 1000)), min = Math.round(s / 60), hr = Math.round(min / 60), d = Math.round(hr / 24);
    if (min < 1) return "agora";
    if (min < 60) return "há " + min + " min";
    if (hr < 24) return "há " + hr + " h";
    if (d < 30) return d === 1 ? "há 1 dia" : "há " + d + " dias";
    var mo = Math.round(d / 30); if (mo < 12) return mo === 1 ? "há 1 mês" : "há " + mo + " meses";
    var y = Math.round(d / 365); return y === 1 ? "há 1 ano" : "há " + y + " anos";
  }
  function plural(n, um, varios) { return n + " " + (n === 1 ? um : varios); }
  function timeNode(iso) { return el("time", { datetime: iso, title: new Date(iso).toLocaleString("pt-BR") }, rel(iso)); }

  function postItem(p) {
    var a = p.autor || {};
    var autor = a.conta || a.anonimo
      ? el("a", { class: "or-painel-autor", href: "/@" + encodeURIComponent(a.nome) }, ">>" + a.nome)
      : el("span", { class: "or-painel-autor is-guest" }, a.nome);
    var selo = a.selo ? el("span", { class: "or-painel-selo", title: a.selo === "M" ? "ADM do site" : "ADM da b/" }, "[" + a.selo + "]") : null;
    return el("li", { class: "or-painel-post" + (p.fixado ? " is-fixado" : ""), "data-id": p.id },
      el("a", { class: "or-painel-titulo", href: p.url }, p.titulo),
      p.dominio ? el("span", { class: "or-painel-dominio" }, " (" + p.dominio + ")") : null,
      el("p", { class: "or-painel-meta" },
        p.fixado ? el("span", { class: "or-painel-fixado" }, "fixado") : null, p.fixado ? " · " : null,
        el("a", { href: "/b/" + p.b + "/", class: "or-painel-b" }, "b/" + p.b), " · ", timeNode(p.criado_em), " · por ", autor, selo ? " " : null, selo,
        " · ", el("a", { href: p.url, class: "or-painel-com" }, p.comentarios ? plural(p.comentarios, "comentário", "comentários") : "comentar"),
        p.enquete ? " · enquete" : null));
  }

  function render(d) {
    var posts = d.postagens || [];
    // Na página de uma b/, as dela já estão no feed ao lado: primeiro as de outras bases; completa com as dela se faltar.
    var outras = atual ? posts.filter(function (p) { return p.b !== atual; }) : posts;
    var lista = outras.length >= 4 || !atual ? outras : outras.concat(posts.filter(function (p) { return p.b === atual; }));
    lista = lista.slice(0, window.matchMedia("(min-width: 1500px)").matches ? 10 : 7);
    var titulo = atual && outras.length && outras.length === lista.length ? "em outras bases" : "postagens recentes";
    var boxP = el("section", { class: "or-painel-box or-painel-posts", id: "or-painel-posts", "aria-labelledby": "or-painel-posts-h" },
      el("h3", { class: "or-painel-h", id: "or-painel-posts-h" }, titulo));
    if (lista.length) {
      var ol = el("ol", { class: "or-painel-list" });
      lista.forEach(function (p) { ol.appendChild(postItem(p)); });
      boxP.appendChild(ol);
    } else boxP.appendChild(el("p", { class: "or-painel-vazio" }, "Nenhuma postagem nas bases ainda. ",
      el("a", { href: atual ? "#bd-post-form" : "/b/atoa/" }, atual ? "Seja o primeiro a postar." : "Poste em b/atoa.")));

    var comms = d.comunidades || [];
    var boxC = el("section", { class: "or-painel-box or-painel-comms", id: "or-painel-comms", "aria-labelledby": "or-painel-comms-h" },
      el("h3", { class: "or-painel-h", id: "or-painel-comms-h" }, "comunidades"));
    var ul = el("ul", { class: "or-painel-list" });
    comms.forEach(function (c) {
      ul.appendChild(el("li", { class: "or-painel-comm" + (c.slug === atual ? " is-atual" : ""), "data-slug": c.slug },
        el("a", { class: "or-painel-comm-nome", href: c.href, "aria-current": c.slug === atual ? "page" : null }, "b/" + c.slug),
        c.nome && c.nome !== c.slug ? el("span", { class: "or-painel-comm-alt" }, " " + c.nome) : null,
        el("p", { class: "or-painel-meta" }, plural(c.postagens, "postagem", "postagens"), " · ", plural(c.membros, "membro", "membros"),
          " · ", c.ultima_atividade ? el("span", null, "ativa ", timeNode(c.ultima_atividade)) : "sem atividade recente")));
    });
    boxC.appendChild(ul);
    boxC.appendChild(el("p", { class: "or-painel-mais" }, el("a", { href: "/b/" }, (d.total_comunidades > comms.length ? "todas as " + d.total_comunidades + " comunidades" : "todas as comunidades") + " »")));

    var wrap = el("div", { class: "or-painel", id: "or-painel" }, boxP, boxC);
    side.appendChild(wrap);
  }

  function load() {
    if (feito) return; feito = true;
    fetch("/api/b/painel", { headers: { Accept: "application/json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d) render(d); })
      .catch(function () {});
  }
  var mq = window.matchMedia(MQ);
  if (mq.matches) load();
  else if (mq.addEventListener) mq.addEventListener("change", function (e) { if (e.matches) load(); });
})();
