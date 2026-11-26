// Moderação: aba "Conexões banidas" (site: todos os bans; ADM de b/: só os da própria b/).
(function () {
  "use strict";
  var root = document.getElementById("mod-conexoes-list");
  var status = document.getElementById("mod-conexoes-status");
  if (!root) return;
  function el(tag, attrs) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) if (attrs[k] != null) { if (k === "class") n.className = attrs[k]; else n.setAttribute(k, attrs[k]); }
    for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c == null || c === false) continue; n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); }
    return n;
  }
  function st(t, k) { status.textContent = t || ""; status.className = "mod-status" + (k ? " " + k : ""); }
  function fmt(iso) { try { return new Date(iso).toLocaleString("pt-BR"); } catch (e) { return iso || ""; } }
  function load() {
    fetch("/api/moderation/conexoes", { credentials: "same-origin", headers: { Accept: "application/json" } })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (d) { return { res: res, d: d }; }); })
      .then(function (o) {
        while (root.firstChild) root.removeChild(root.firstChild);
        if (!o.res.ok) { st((o.d && o.d.erro) || "Não foi possível carregar.", "erro"); return; }
        var list = o.d.conexoes || [];
        st(list.length ? list.length + (list.length === 1 ? " conexão banida." : " conexões banidas.") : "Nenhuma conexão banida.");
        if (!list.length) { root.appendChild(el("p", { class: "mod-empty" }, "Para banir, use \"banir conexão\" num item publicado sem conta (feed, postagem, comentários ou nesta página).")); return; }
        list.forEach(function (b) {
          var un = el("button", { type: "button", class: "mod-btn secondary", "data-desbanir": b.id }, "Desbanir");
          un.addEventListener("click", function () {
            if (!confirm("Desbanir " + b.rotulo + "?")) return;
            un.disabled = true;
            fetch("/api/moderation/conexoes/" + encodeURIComponent(b.id), { method: "DELETE", credentials: "same-origin", headers: { Accept: "application/json" } })
              .then(function (res) { if (res.ok) load(); else { un.disabled = false; st("Não foi possível desbanir.", "erro"); } })
              .catch(function () { un.disabled = false; st("Falha de rede.", "erro"); });
          });
          root.appendChild(el("article", { class: "mod-item mod-ban-item", "data-ban-id": b.id },
            el("p", { class: "mod-meta" },
              el("strong", { class: "mod-ban-label" }, b.rotulo),
              b.rotulo_site ? el("span", { class: "mod-ban-site", title: "rótulo desta conexão no escopo do site" }, " (" + b.rotulo_site.replace("conexão ", "") + " no site)") : null,
              " · ", el("span", { class: "mod-ban-scope" }, b.escopo === "site" ? "site todo" : "b/" + b.escopo),
              " · ", b.expira_em ? "até " + fmt(b.expira_em) : "permanente"),
            el("p", { class: "mod-body" }, "Banida por ", b.por ? el("a", { class: "user-mention", href: "/@" + b.por }, ">>" + b.por) : "senha de ADM", " em " + fmt(b.criado_em),
              b.motivo ? el("span", { class: "mod-ban-motivo" }, " · motivo: " + b.motivo) : null),
            el("div", { class: "mod-actions" }, un)));
        });
      })
      .catch(function () { st("Falha de rede.", "erro"); });
  }
  window.BDModConexoes = { load: load };
})();
