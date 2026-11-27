// MOR-35 — moderação: aba "Votos" (recentes + por conta). Site: tudo; ADM de b/: só a própria b/.
(function () {
  "use strict";
  var root = document.getElementById("mod-votos-list");
  var status = document.getElementById("mod-votos-status");
  var filtro = document.getElementById("mod-votos-filtro");
  var reload = document.getElementById("mod-votos-recarregar");
  if (!root) return;
  var data = null;
  function el(tag, attrs) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) if (attrs[k] != null) { if (k === "class") n.className = attrs[k]; else n.setAttribute(k, attrs[k]); }
    for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c == null || c === false) continue; n.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c); }
    return n;
  }
  function st(t, k) { status.textContent = t || ""; status.className = "mod-status" + (k ? " " + k : ""); }
  function fmt(iso) { if (window.BDAccount && window.BDAccount.localTimeNode) return window.BDAccount.localTimeNode(iso); try { return document.createTextNode(new Date(iso).toLocaleString("pt-BR")); } catch (e) { return document.createTextNode(iso || ""); } }
  function num(x) { return x == null ? "—" : String(x).replace(".", ","); }
  function conta(c) { return el("a", { class: "user-mention", href: "/@" + encodeURIComponent(c) }, ">>" + c); }
  function th() { var tr = el("tr"); for (var i = 0; i < arguments.length; i++) tr.appendChild(el("th", { scope: "col" }, arguments[i])); return el("thead", null, tr); }
  function td(label, child, cls) { return el("td", { "data-label": label, class: cls || null }, child); }
  function render() {
    while (root.firstChild) root.removeChild(root.firstChild);
    if (!data) return;
    var q = (filtro && filtro.value || "").trim().toLowerCase().replace(/^>>|^@/, "");
    var contas = (data.contas || []).filter(function (c) { return !q || c.conta.toLowerCase().indexOf(q) >= 0; });
    var rec = (data.recentes || []).filter(function (r) { return !q || r.conta.toLowerCase().indexOf(q) >= 0; });
    root.appendChild(el("h3", { class: "mod-votos-h" }, "Por conta"));
    if (!contas.length) root.appendChild(el("p", { class: "mod-empty" }, q ? "Nenhuma conta com esse nome votou." : "Ninguém votou ainda."));
    else {
      var t1 = el("table", { class: "mod-res-table mod-votos-contas" }, th("conta", "▲ +1", "▼ −1", "notas", "média ★", "último"));
      var b1 = el("tbody");
      contas.forEach(function (c) {
        b1.appendChild(el("tr", { "data-conta": c.conta }, td("conta", conta(c.conta)), td("▲ +1", String(c.up), "mod-votos-up"), td("▼ −1", String(c.down), "mod-votos-down"),
          td("notas", String(c.notas)), td("média ★", num(c.media)), td("último", fmt(c.ultimo))));
      });
      t1.appendChild(b1);
      root.appendChild(el("div", { class: "mod-table-scroll" }, t1));
    }
    root.appendChild(el("h3", { class: "mod-votos-h" }, "Recentes"));
    if (!rec.length) { root.appendChild(el("p", { class: "mod-empty" }, "Nada por aqui.")); return; }
    var t2 = el("table", { class: "mod-res-table mod-votos-recentes" }, th("quando", "conta", "o quê", "item", "onde"));
    var b2 = el("tbody");
    rec.forEach(function (r) {
      var acao = r.tipo === "voto" ? el("span", { class: r.valor > 0 ? "mod-votos-up" : "mod-votos-down" }, r.valor > 0 ? "▲ +1" : "▼ −1") : el("span", { class: "mod-votos-nota" }, "★ " + r.valor);
      var nome = (r.item_tipo === "post" ? "postagem: " : "comentário: ") + (r.titulo || "(sem texto)");
      var item = r.href ? el("a", { href: r.href }, nome) : document.createTextNode(nome);
      b2.appendChild(el("tr", { "data-item": r.item_id }, td("quando", fmt(r.em)), td("conta", conta(r.conta)), td("o quê", acao), td("item", item, "mod-votos-item"), td("onde", r.b ? "b/" + r.b : "site")));
    });
    t2.appendChild(b2);
    root.appendChild(el("div", { class: "mod-table-scroll" }, t2));
  }
  function load() {
    st("Carregando…");
    fetch("/api/moderation/votos", { credentials: "same-origin", headers: { Accept: "application/json" } })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (d) { return { res: res, d: d }; }); })
      .then(function (o) {
        if (!o.res.ok) { data = null; render(); st((o.d && o.d.erro) || "Não foi possível carregar.", "erro"); return; }
        data = o.d;
        var n = (data.recentes || []).length, c = (data.contas || []).length;
        st(c ? c + (c === 1 ? " conta votou" : " contas votaram") + " · " + n + (n === 1 ? " registro recente" : " registros recentes") + (Array.isArray(data.escopo) ? " · escopo: " + data.escopo.map(function (s) { return "b/" + s; }).join(", ") : " · escopo: site todo") : "Nenhum voto ainda.");
        render();
      })
      .catch(function () { st("Falha de rede.", "erro"); });
  }
  if (filtro) filtro.addEventListener("input", render);
  if (reload) reload.addEventListener("click", load);
  load();
})();
