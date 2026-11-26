// Moderação: artes ASCII dos perfis (só ADMs do site).
(function () {
  "use strict";
  var started = false;
  function el(tag, attrs) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    for (var key in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, key)) continue;
      var val = attrs[key];
      if (val == null) continue;
      if (key === "class") node.className = val;
      else if (key.slice(0, 2) === "on" && typeof val === "function") node.addEventListener(key.slice(2).toLowerCase(), val);
      else node.setAttribute(key, val);
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return node;
  }
  function setStatus(n, text, kind) { n.textContent = text || ""; n.className = "mod-status" + (kind ? " " + kind : ""); }
  function fmt(iso) { try { return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }); } catch (e) { return iso || ""; } }

  function load() {
    var root = document.getElementById("ma-list");
    var st = document.getElementById("ma-status");
    if (!root) return;
    setStatus(st, "Carregando artes…");
    fetch("/api/moderation/ascii", { credentials: "same-origin", headers: { Accept: "application/json" } })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (d) { return { res: res, data: d }; }); })
      .then(function (out) {
        if (!out.res.ok) { setStatus(st, (out.data && out.data.erro) || "Falha ao listar artes.", "erro"); return; }
        while (root.firstChild) root.removeChild(root.firstChild);
        var items = out.data.artes || [];
        var nAv = items.filter(function (x) { return x.tipo === "avatar"; }).length;
        setStatus(st, (items.length - nAv) + " arte(s) · " + nAv + " avatar(es).");
        if (!items.length) { root.appendChild(el("p", { class: "mod-empty" }, "Nenhum perfil com arte ou avatar ASCII.")); return; }
        items.forEach(function (a) {
          var isAv = a.tipo === "avatar";
          var pre = el("pre", { class: "ma-art" + (isAv ? " ma-avatar" : "") });
          if (window.BDAccount && window.BDAccount.colorize) window.BDAccount.colorize(pre, a.arte, a.cores || null); // textNodes/spans, nunca HTML
          else pre.textContent = a.arte; // texto puro, sempre escapado
          var del = el("button", { type: "button", class: "mod-btn danger mod-btn-sm ma-del" }, isAv ? "Remover avatar" : "Remover arte");
          del.addEventListener("click", function () {
            if (!confirm((isAv ? "Remover o avatar ASCII de >>" : "Remover a arte ASCII de >>") + a.username + "?")) return;
            del.disabled = true;
            fetch("/api/moderation/ascii/" + encodeURIComponent(a.username) + "?tipo=" + (isAv ? "avatar" : "arte"), { method: "DELETE", credentials: "same-origin", headers: { Accept: "application/json" } })
              .then(function (res) { return res.json().catch(function () { return {}; }).then(function (d) {
                if (res.ok) load();
                else { del.disabled = false; setStatus(st, (d && d.erro) || "Não foi possível remover.", "erro"); }
              }); })
              .catch(function () { del.disabled = false; setStatus(st, "Falha de rede.", "erro"); });
          });
          root.appendChild(el("div", { class: "ma-item", "data-tipo": isAv ? "avatar" : "arte", "data-user": a.username },
            el("div", { class: "ma-head" },
              el("a", { class: "user-mention", href: "/@" + a.username }, ">>" + a.username),
              el("span", { class: "ma-tipo" + (isAv ? " avatar" : "") }, isAv ? "avatar" : "arte"),
              el("span", { class: "ma-meta" }, (isAv ? "8×16" : a.moldura === "nenhuma" ? "sem moldura" : "moldura simples") + " · " + fmt(a.atualizada_em)),
              del),
            el("div", { class: "ma-scroll" }, pre)));
        });
      })
      .catch(function () { setStatus(st, "Falha de rede ao listar artes.", "erro"); });
  }
  window.BDModAscii = { init: function () { if (started) return; started = true; load(); }, reload: load };
})();
