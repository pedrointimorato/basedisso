// MOR-35 — votos (▲/▼) e nota de aplicabilidade (★ 1–5) em postagens e comentários.
// O servidor manda: cada clique vai para /api/votos e a barra mostra o que ele devolver.
// Só contas registram voto; sem conta aparece o convite para entrar.
(function () {
  "use strict";
  var V = "20261201b";
  if (!document.querySelector('link[data-votos-css]')) {
    var lk = document.createElement("link");
    lk.rel = "stylesheet"; lk.href = "/votos.css?v=" + V; lk.setAttribute("data-votos-css", "");
    document.head.appendChild(lk);
  }
  function el(tag, attrs) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) if (attrs[k] != null && attrs[k] !== false) { if (k === "class") n.className = attrs[k]; else n.setAttribute(k, attrs[k]); }
    for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c == null || c === false) continue; n.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c); }
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function num(x) { return String(x).replace(".", ","); }
  function timeNode(iso) {
    if (window.BDAccount && window.BDAccount.localTimeNode) return window.BDAccount.localTimeNode(iso);
    try { return el("time", { datetime: iso, "data-hora-local": "" }, new Date(iso).toLocaleString("pt-BR")); } catch (e) { return document.createTextNode(iso || ""); }
  }
  var openPop = null;
  function closePop() { if (openPop) { var p = openPop; openPop = null; if (p.btn) p.btn.setAttribute("aria-expanded", "false"); if (p.node.parentNode) p.node.parentNode.removeChild(p.node); } }
  document.addEventListener("click", function (e) { if (openPop && !openPop.node.contains(e.target) && !openPop.btn.contains(e.target)) closePop(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && openPop) { var b = openPop.btn; closePop(); try { b.focus(); } catch (x) {} } });

  function send(payload) {
    return fetch("/api/votos", {
      method: "POST", credentials: "same-origin",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(function (res) { return res.json().catch(function () { return {}; }).then(function (d) { return { res: res, d: d }; }); });
  }

  function bar(o) {
    o = o || {};
    var s = { score: +o.score || 0, meu: +o.meu || 0, media: o.nota_media == null ? null : +o.nota_media, total: +o.nota_total || 0, minha: +o.minha_nota || 0 };
    var proprio = Boolean(o.proprio);
    var label = o.tipo === "comment" ? "comentário" : "postagem";
    var wrap = el("span", { class: "bd-votos" + (proprio ? " is-proprio" : ""), "data-votos-tipo": o.tipo, "data-votos-id": o.id });
    var up = el("button", { type: "button", class: "bd-voto bd-voto-up", "aria-label": "voto positivo", title: proprio ? "não dá para votar no próprio item" : "voto positivo" });
    var score = el("span", { class: "bd-voto-score", title: "pontuação (soma dos votos)" });
    var down = el("button", { type: "button", class: "bd-voto bd-voto-down", "aria-label": "voto negativo", title: proprio ? "não dá para votar no próprio item" : "voto negativo" });
    var star = el("button", { type: "button", class: "bd-nota-btn", "aria-haspopup": "dialog", "aria-expanded": "false", title: "nota de aplicabilidade ao tópico" });
    var msg = el("span", { class: "bd-votos-msg", role: "status", hidden: "" });
    wrap.appendChild(up); wrap.appendChild(score); wrap.appendChild(down); wrap.appendChild(star);
    var quem = null;
    if (o.adm) { quem = el("button", { type: "button", class: "bd-votos-quem", "aria-haspopup": "dialog", "aria-expanded": "false", title: "só ADMs veem quem votou" }, "quem votou"); wrap.appendChild(quem); }
    wrap.appendChild(msg);
    if (proprio) { up.disabled = true; down.disabled = true; }

    function paint() {
      score.textContent = String(s.score);
      up.classList.toggle("is-on", s.meu === 1); up.setAttribute("aria-pressed", s.meu === 1 ? "true" : "false");
      down.classList.toggle("is-on", s.meu === -1); down.setAttribute("aria-pressed", s.meu === -1 ? "true" : "false");
      wrap.classList.toggle("voto-up", s.meu === 1); wrap.classList.toggle("voto-down", s.meu === -1);
      clear(star);
      star.appendChild(el("span", { class: "bd-nota-ico", "aria-hidden": "true" }, s.minha ? "★" : "☆"));
      star.appendChild(el("span", { class: "bd-nota-media" }, s.total ? num(s.media) : "nota"));
      if (s.total) star.appendChild(el("span", { class: "bd-nota-total" }, "(" + s.total + ")"));
      star.classList.toggle("is-on", s.minha > 0);
      star.setAttribute("aria-label", "aplicabilidade ao tópico: " + (s.total ? "média " + num(s.media) + " de 5, " + s.total + (s.total === 1 ? " nota" : " notas") : "sem notas") + (s.minha ? "; sua nota " + s.minha : ""));
    }
    function apply(v) { if (!v) return; s.score = +v.score || 0; s.meu = +v.meu || 0; s.media = v.nota_media == null ? null : +v.nota_media; s.total = +v.nota_total || 0; s.minha = +v.minha_nota || 0; paint(); if (typeof o.onChange === "function") { try { o.onChange(v); } catch (e) {} } }
    function say(node, kind) {
      clear(msg);
      if (!node) { msg.hidden = true; return; }
      msg.appendChild(typeof node === "string" ? document.createTextNode(node) : node);
      msg.className = "bd-votos-msg" + (kind ? " " + kind : "");
      msg.hidden = false;
    }
    function loginPrompt(what) {
      var f = document.createDocumentFragment();
      f.appendChild(el("a", { href: "/entrar/?next=" + encodeURIComponent(location.pathname + location.search + location.hash) }, "Entre na sua conta"));
      f.appendChild(document.createTextNode(" para " + what + ". Só contas votam."));
      return f;
    }
    function post(payload, what) {
      wrap.classList.add("is-busy");
      return send(payload).then(function (r) {
        wrap.classList.remove("is-busy");
        if (r.res.ok) { apply(r.d.votos); say(null); return true; }
        if (r.res.status === 401) say(loginPrompt(what), "entrar");
        else say((r.d && r.d.erro) || "Não foi possível registrar.", "erro");
        return false;
      }).catch(function () { wrap.classList.remove("is-busy"); say("Falha de rede.", "erro"); return false; });
    }
    function vote(v) { if (proprio) return; post({ tipo: o.tipo, id: o.id, voto: s.meu === v ? 0 : v }, "votar"); }
    up.addEventListener("click", function () { vote(1); });
    down.addEventListener("click", function () { vote(-1); });

    star.addEventListener("click", function () {
      if (openPop && openPop.btn === star) { closePop(); return; }
      closePop();
      var pop = el("div", { class: "bd-nota-pop", role: "dialog", "aria-label": "aplicabilidade ao tópico" });
      pop.appendChild(el("p", { class: "bd-nota-pop-title" }, "aplicabilidade ao tópico"));
      var row = el("div", { class: "bd-nota-stars", role: "group", "aria-label": "nota de 1 a 5" });
      var btns = [];
      var opening = true;
      function hi(n) { btns.forEach(function (b, i) { b.classList.toggle("is-hi", i < n); b.textContent = i < n ? "★" : "☆"; }); }
      for (var i = 1; i <= 5; i++) (function (n) {
        var b = el("button", { type: "button", class: "bd-nota-star" + (s.minha === n ? " is-mine" : ""), "data-nota": n, "aria-pressed": s.minha === n ? "true" : "false", "aria-label": n + (n === 1 ? " estrela" : " estrelas"), title: n + " de 5" }, "☆");
        b.addEventListener("mouseenter", function () { hi(n); });
        b.addEventListener("focus", function () { if (!opening) hi(n); });
        b.addEventListener("click", function () {
          if (proprio) return;
          post({ tipo: o.tipo, id: o.id, nota: s.minha === n ? 0 : n }, "dar nota").then(function (ok) { closePop(); });
        });
        btns.push(b); row.appendChild(b);
      })(i);
      row.addEventListener("mouseleave", function () { hi(s.minha); });
      pop.appendChild(row);
      hi(s.minha);
      var info = s.total ? "média " + num(s.media) + " de 5 · " + s.total + (s.total === 1 ? " nota" : " notas") : "sem notas ainda";
      pop.appendChild(el("p", { class: "bd-nota-pop-info" }, info, s.minha ? el("span", { class: "bd-nota-sua" }, " · sua nota: " + s.minha) : null));
      if (proprio) pop.appendChild(el("p", { class: "bd-nota-pop-info" }, "Você não dá nota ao próprio " + label + "."));
      else if (s.minha) {
        var rm = el("button", { type: "button", class: "bd-nota-remover" }, "remover minha nota");
        rm.addEventListener("click", function () { post({ tipo: o.tipo, id: o.id, nota: 0 }, "dar nota").then(function (ok) { if (ok) closePop(); }); });
        pop.appendChild(rm);
      }
      wrap.appendChild(pop);
      star.setAttribute("aria-expanded", "true");
      openPop = { node: pop, btn: star };
      var first = pop.querySelector(".bd-nota-star.is-mine") || btns[0];
      try { first.focus({ preventScroll: true }); } catch (e) {}
      opening = false;
    });

    if (quem) quem.addEventListener("click", function () {
      if (openPop && openPop.btn === quem) { closePop(); return; }
      closePop();
      var pop = el("div", { class: "bd-votos-pop", role: "dialog", "aria-label": "quem votou neste item" }, el("p", { class: "bd-nota-pop-title" }, "quem votou · visível só para ADMs"), el("p", { class: "bd-nota-pop-info" }, "carregando…"));
      wrap.appendChild(pop);
      quem.setAttribute("aria-expanded", "true");
      openPop = { node: pop, btn: quem };
      fetch("/api/moderation/votos?tipo=" + encodeURIComponent(o.tipo) + "&id=" + encodeURIComponent(o.id), { credentials: "same-origin", headers: { Accept: "application/json" } })
        .then(function (res) { return res.json().catch(function () { return {}; }).then(function (d) { return { res: res, d: d }; }); })
        .then(function (r) {
          while (pop.childNodes.length > 1) pop.removeChild(pop.lastChild);
          if (!r.res.ok) { pop.appendChild(el("p", { class: "bd-nota-pop-info erro" }, (r.d && r.d.erro) || "Não foi possível carregar.")); return; }
          var list = r.d.votantes || [];
          var rs = r.d.resumo || {};
          pop.appendChild(el("p", { class: "bd-nota-pop-info" }, "▲ " + (rs.up || 0) + " · ▼ " + (rs.down || 0) + " · ★ " + (rs.nota_total ? num(rs.nota_media) + " (" + rs.nota_total + ")" : "—")));
          if (!list.length) { pop.appendChild(el("p", { class: "bd-nota-pop-info" }, "Ninguém votou ainda.")); return; }
          var ul = el("ul", { class: "bd-votantes" });
          list.forEach(function (v) {
            var when = v.voto_em && v.nota_em ? (v.voto_em > v.nota_em ? v.voto_em : v.nota_em) : (v.voto_em || v.nota_em);
            ul.appendChild(el("li", { class: "bd-votante" },
              el("a", { class: "user-mention", href: "/@" + encodeURIComponent(v.conta) }, ">>" + v.conta),
              el("span", { class: "bd-votante-voto " + (v.voto > 0 ? "up" : v.voto < 0 ? "down" : "nenhum") }, v.voto > 0 ? "▲ +1" : v.voto < 0 ? "▼ −1" : "sem voto"),
              el("span", { class: "bd-votante-nota" }, v.nota ? "★ " + v.nota : "sem nota"),
              when ? timeNode(when) : null));
          });
          pop.appendChild(ul);
        })
        .catch(function () { pop.appendChild(el("p", { class: "bd-nota-pop-info erro" }, "Falha de rede.")); });
    });

    paint();
    return wrap;
  }

  function hydrate(root) {
    (root || document).querySelectorAll("[data-votos]").forEach(function (n) {
      var o; try { o = JSON.parse(n.getAttribute("data-votos")); } catch (e) { return; }
      n.removeAttribute("data-votos");
      n.parentNode.replaceChild(bar(o), n);
    });
  }
  window.BDVotos = { bar: bar, hydrate: hydrate, version: V };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { hydrate(document); });
  else hydrate(document);
})();
