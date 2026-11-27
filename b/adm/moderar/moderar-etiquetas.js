// MOR-36 — moderação: aba "Etiquetas". ADM do site: escopo 'site' + todas as b/; ADM de b/: só as próprias.
(function () {
  "use strict";
  var list = document.getElementById("mod-etq-list");
  var sel = document.getElementById("mod-etq-escopo");
  var status = document.getElementById("mod-etq-status");
  var form = document.getElementById("mod-etq-form");
  var fstatus = document.getElementById("mod-etq-form-status");
  var prev = document.getElementById("mod-etq-prev");
  if (!list || !sel || !form) return;
  var CORES = [["0", "padrão"], ["1", "vermelho"], ["2", "laranja"], ["3", "amarelo"], ["4", "verde"], ["5", "ciano"], ["6", "azul"], ["7", "roxo"], ["8", "cinza"]];
  var data = null;
  function el(tag, attrs) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) if (attrs[k] != null && attrs[k] !== false) { if (k === "class") n.className = attrs[k]; else n.setAttribute(k, attrs[k]); }
    for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c == null || c === false) continue; n.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c); }
    return n;
  }
  function st(node, t, k) { node.textContent = t || ""; node.className = "mod-status" + (k ? " " + k : ""); }
  function chip(t) { return el("span", { class: "bd-tag bd-tag-c" + (t.cor || "0") }, t.nome || "etiqueta"); }
  function corSelect(v) { var s = el("select", { class: "mod-select mod-etq-cor", "aria-label": "cor" }); CORES.forEach(function (c) { var o = el("option", { value: c[0] }, c[1]); if (c[0] === v) o.selected = true; s.appendChild(o); }); return s; }
  function req(method, url, body) {
    return fetch(url, { method: method, credentials: "same-origin", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (d) { return { res: res, d: d }; }); });
  }
  var fc = form.querySelector('select[name="cor"]');
  CORES.forEach(function (c) { fc.appendChild(el("option", { value: c[0] }, c[1])); });
  function updPrev() { while (prev.firstChild) prev.removeChild(prev.firstChild); prev.appendChild(chip({ nome: form.nome.value.trim() || "nova", cor: fc.value })); }
  form.nome.addEventListener("input", updPrev); fc.addEventListener("change", updPrev); updPrev();

  function render() {
    while (list.firstChild) list.removeChild(list.firstChild);
    if (!data) return;
    var esc = sel.value;
    var items = (data.etiquetas || []).filter(function (t) { return t.escopo === esc; });
    var ativas = items.filter(function (t) { return t.ativa; }).length;
    st(status, items.length ? ativas + (ativas === 1 ? " ativa" : " ativas") + (items.length > ativas ? " · " + (items.length - ativas) + " desativada(s)" : "") + " · máx. " + data.max_por_escopo : "Nenhuma etiqueta neste escopo ainda.");
    if (esc !== "site") {
      var site = (data.etiquetas || []).filter(function (t) { return t.escopo === "site" && t.ativa; });
      if (site.length || !data.escopos.some(function (e) { return e.escopo === "site"; })) {
        var note = el("li", { class: "mod-etq-note" }, "Também valem aqui as etiquetas do site" + (site.length ? ": " : " (geridas pelos ADMs do site)."));
        site.forEach(function (t) { note.appendChild(document.createTextNode(" ")); note.appendChild(chip(t)); });
        list.appendChild(note);
      }
    }
    items.forEach(function (t) {
      var nome = el("input", { type: "text", maxlength: "24", value: t.nome, "aria-label": "nome" });
      var cor = corSelect(t.cor);
      var desc = el("input", { type: "text", maxlength: "120", value: t.descricao || "", placeholder: "descrição (opcional)", "aria-label": "descrição" });
      var ordem = el("input", { type: "number", min: "0", max: "100000", step: "10", value: String(t.ordem), "aria-label": "ordem", class: "mod-etq-ordem" });
      var pv = el("span", { class: "mod-etq-chip" }, chip(t));
      function repaint() { while (pv.firstChild) pv.removeChild(pv.firstChild); pv.appendChild(chip({ nome: nome.value.trim() || t.nome, cor: cor.value })); }
      nome.addEventListener("input", repaint); cor.addEventListener("change", repaint);
      var msg = el("span", { class: "mod-etq-msg", role: "status" });
      var save = el("button", { type: "button", class: "mod-btn mod-btn-sm" }, "Salvar");
      var tog = el("button", { type: "button", class: "mod-btn secondary mod-btn-sm" }, t.ativa ? "Desativar" : "Reativar");
      function patch(body, btn) {
        btn.disabled = true; msg.textContent = "…";
        req("PATCH", "/api/moderation/etiquetas/" + encodeURIComponent(t.id), body).then(function (r) {
          btn.disabled = false;
          if (!r.res.ok) { msg.textContent = (r.d && r.d.erro) || "Erro."; msg.className = "mod-etq-msg erro"; return; }
          var i = data.etiquetas.indexOf(t); data.etiquetas[i] = r.d.etiqueta; render();
          var row = list.querySelector('[data-etq-id="' + t.id + '"] .mod-etq-msg'); if (row) { row.textContent = "salvo"; row.className = "mod-etq-msg ok"; }
        }).catch(function () { btn.disabled = false; msg.textContent = "Falha de rede."; msg.className = "mod-etq-msg erro"; });
      }
      save.addEventListener("click", function () { patch({ nome: nome.value, cor: cor.value, descricao: desc.value, ordem: Number(ordem.value) || 0 }, save); });
      tog.addEventListener("click", function () { patch({ ativa: !t.ativa }, tog); });
      list.appendChild(el("li", { class: "mod-etq-item" + (t.ativa ? "" : " is-off"), "data-etq-id": t.id, "data-etq-slug": t.slug },
        el("div", { class: "mod-etq-top" }, pv, el("code", { class: "mod-etq-slug", title: "endereço do filtro" }, "?etiqueta=" + t.slug),
          el("span", { class: "mod-etq-usos" }, t.usos + (t.usos === 1 ? " uso" : " usos")), t.ativa ? null : el("span", { class: "mod-etq-off" }, "desativada")),
        el("div", { class: "mod-row mod-etq-row" }, el("label", null, "nome ", nome), el("label", null, "cor ", cor), el("label", { class: "mod-etq-desc" }, "descrição ", desc), el("label", null, "ordem ", ordem)),
        el("div", { class: "mod-actions mod-etq-actions" }, save, tog, msg)));
    });
  }
  function load(keep) {
    st(status, "Carregando…");
    return req("GET", "/api/moderation/etiquetas").then(function (r) {
      if (!r.res.ok) { data = null; render(); st(status, (r.d && r.d.erro) || "Não foi possível carregar.", "erro"); return; }
      data = r.d;
      var want = keep || sel.value || (new URLSearchParams(location.search).get("b") || "");
      while (sel.firstChild) sel.removeChild(sel.firstChild);
      (data.escopos || []).forEach(function (e) { sel.appendChild(el("option", { value: e.escopo }, e.nome)); });
      if (want && (data.escopos || []).some(function (e) { return e.escopo === want; })) sel.value = want;
      render();
    }).catch(function () { st(status, "Falha de rede.", "erro"); });
  }
  sel.addEventListener("change", function () { render(); st(fstatus, ""); });
  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var b = form.querySelector('button[type="submit"]'); b.disabled = true; st(fstatus, "Criando…");
    req("POST", "/api/moderation/etiquetas", { escopo: sel.value, nome: form.nome.value, cor: fc.value, descricao: form.descricao.value }).then(function (r) {
      b.disabled = false;
      if (!r.res.ok) { st(fstatus, (r.d && r.d.erro) || "Não foi possível criar.", "erro"); return; }
      data.etiquetas.push(r.d.etiqueta); form.reset(); updPrev(); render(); st(fstatus, "Etiqueta “" + r.d.etiqueta.nome + "” criada.", "ok");
    }).catch(function () { b.disabled = false; st(fstatus, "Falha de rede.", "erro"); });
  });
  load();
})();
