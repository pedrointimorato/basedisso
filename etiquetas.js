// MOR-36 — etiquetas em postagens e comentários: chips, seletor no formulário e edição (autor ou ADM).
// O servidor valida tudo (/api/etiquetas, /api/etiquetas/item). Máximo 3 por item.
(function () {
  "use strict";
  var V = "20261202a";
  var MAX = 3;
  if (!document.querySelector("link[data-etiquetas-css]")) {
    var lk = document.createElement("link");
    lk.rel = "stylesheet"; lk.href = "/etiquetas.css?v=" + V; lk.setAttribute("data-etiquetas-css", "");
    document.head.appendChild(lk);
  }
  function el(tag, attrs) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) if (attrs[k] != null && attrs[k] !== false) { if (k === "class") n.className = attrs[k]; else n.setAttribute(k, attrs[k]); }
    for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c == null || c === false) continue; n.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c); }
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function cor(t) { return /^[0-8]$/.test(String(t && t.cor)) ? String(t.cor) : "0"; }

  // ---------- disponíveis (cache por escopo) ----------
  var cache = {};
  function available(o) {
    var key = o.b ? "b=" + encodeURIComponent(o.b) : "page=" + encodeURIComponent(o.page || "");
    if (!cache[key]) cache[key] = fetch("/api/etiquetas?" + key, { credentials: "same-origin", headers: { Accept: "application/json" } })
      .then(function (r) { return r.ok ? r.json() : { etiquetas: [] }; })
      .then(function (d) { if (d && d.max) MAX = d.max; return (d && d.etiquetas) || []; })
      .catch(function () { delete cache[key]; return []; });
    return cache[key];
  }

  // ---------- chips ----------
  function chip(t, o) {
    var title = (t.descricao ? t.descricao : "etiqueta " + t.nome) + (t.por_adm ? " · posta por um ADM" : "") + (t.escopo && t.escopo !== "site" ? " · etiqueta de b/" + t.escopo : "");
    var cls = "bd-tag bd-tag-c" + cor(t) + (t.por_adm ? " is-adm" : "");
    if (o && o.link && o.b) return el("a", { class: cls, href: "/b/" + encodeURIComponent(o.b) + "/?etiqueta=" + encodeURIComponent(t.slug), title: title + " · ver só postagens com esta etiqueta", "data-etiqueta": t.slug }, t.nome);
    return el("span", { class: cls, title: title, "data-etiqueta": t.slug }, t.nome);
  }
  function fillChips(host, list, o) {
    clear(host);
    (list || []).forEach(function (t, i) { if (i) host.appendChild(document.createTextNode(" ")); host.appendChild(chip(t, o)); });
    host.hidden = !(list && list.length);
    return host;
  }
  // Host de chips que se atualiza: o = { tipo, id, b, lista }
  function host(o) {
    var h = el("span", { class: "bd-tags", "aria-label": "etiquetas" });
    h._o = o;
    fillChips(h, o.lista || [], { link: o.tipo === "post", b: o.b });
    return h;
  }

  // ---------- seletor (formulário e edição) ----------
  // o = { b | page, selected: [ids], locked: [ids] (postas por ADM, autor não tira), max }
  function picker(o) {
    o = o || {};
    var max = o.max || MAX;
    var sel = (o.selected || []).slice();
    var locked = o.locked || [];
    var box = el("fieldset", { class: "bd-tag-picker", hidden: "hidden" });
    var legend = el("legend", null, "Etiquetas ", el("span", { class: "bd-tag-picker-hint" }, "(opcional, até " + max + ")"));
    var list = el("div", { class: "bd-tag-picker-list", role: "group", "aria-label": "escolher etiquetas" });
    var hint = el("p", { class: "bd-tag-picker-msg", role: "status" });
    box.appendChild(legend); box.appendChild(list); box.appendChild(hint);
    var btns = [];
    function sync() {
      btns.forEach(function (b) {
        var id = b.getAttribute("data-id"), on = sel.indexOf(id) >= 0, lk = locked.indexOf(id) >= 0;
        b.setAttribute("aria-pressed", on ? "true" : "false"); b.classList.toggle("is-on", on);
        b.disabled = lk || (!on && sel.length >= max);
      });
      hint.textContent = sel.length >= max ? "Limite de " + max + " etiquetas." : "";
    }
    var ready = available(o).then(function (tags) {
      clear(list); btns = [];
      tags.forEach(function (t) {
        var b = el("button", { type: "button", class: "bd-tag bd-tag-opt bd-tag-c" + cor(t), "data-id": t.id, "data-etiqueta": t.slug, title: t.descricao || t.nome, "aria-pressed": "false" }, t.nome);
        b.addEventListener("click", function () {
          var i = sel.indexOf(t.id);
          if (i >= 0) { if (locked.indexOf(t.id) < 0) sel.splice(i, 1); } else if (sel.length < max) sel.push(t.id);
          sync();
        });
        btns.push(b); list.appendChild(b);
      });
      box.hidden = !tags.length;
      sync();
      return tags;
    });
    return {
      node: box, ready: ready,
      value: function () { return sel.slice(); },
      reset: function () { sel = []; sync(); },
    };
  }

  function send(o, ids) {
    return fetch("/api/etiquetas/item", {
      method: "PUT", credentials: "same-origin",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: o.tipo, id: o.id, etiquetas: ids }),
    }).then(function (res) { return res.json().catch(function () { return {}; }).then(function (d) { return { res: res, d: d }; }); });
  }

  var openEd = null;
  function closeEd() { if (openEd) { var e = openEd; openEd = null; e.btn.setAttribute("aria-expanded", "false"); if (e.node.parentNode) e.node.parentNode.removeChild(e.node); } }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && openEd) { var b = openEd.btn; closeEd(); try { b.focus(); } catch (x) {} } });
  document.addEventListener("click", function (e) { if (openEd && !openEd.node.contains(e.target) && !openEd.btn.contains(e.target)) closeEd(); });

  // Botão "etiquetas" (autor ou ADM). h = host dos chips; o = { tipo, id, b, page, adm }
  function editButton(h, o) {
    var btn = el("button", { type: "button", class: "bd-tag-edit", "aria-haspopup": "dialog", "aria-expanded": "false", title: o.adm ? "etiquetas (ADM)" : "editar etiquetas" }, "etiquetas");
    btn.addEventListener("click", function (ev) {
      ev.stopPropagation();
      if (openEd && openEd.btn === btn) { closeEd(); return; }
      closeEd();
      var cur = (h._o.lista || []);
      var locked = o.adm ? [] : cur.filter(function (t) { return t.por_adm; }).map(function (t) { return t.id; });
      var p = picker({ b: o.b, page: o.page, selected: cur.map(function (t) { return t.id; }), locked: locked });
      var msg = el("p", { class: "bd-tag-ed-msg", role: "status" });
      var save = el("button", { type: "button", class: "bd-tag-save" }, "salvar");
      var cancel = el("button", { type: "button", class: "bd-tag-cancel" }, "cancelar");
      var node = el("div", { class: "bd-tag-editor", role: "dialog", "aria-label": "editar etiquetas" }, p.node,
        locked.length ? el("p", { class: "bd-tag-ed-note" }, "Etiquetas postas por um ADM só um ADM tira.") : null,
        el("p", { class: "bd-tag-ed-actions" }, save, " ", cancel), msg);
      p.ready.then(function (tags) { if (!tags.length) { p.node.hidden = true; msg.textContent = "Não há etiquetas disponíveis aqui."; } });
      cancel.addEventListener("click", closeEd);
      save.addEventListener("click", function () {
        save.disabled = true; msg.textContent = "Salvando…"; msg.className = "bd-tag-ed-msg";
        send(o, p.value()).then(function (r) {
          save.disabled = false;
          if (!r.res.ok) { msg.textContent = (r.d && r.d.erro) || "Não foi possível salvar."; msg.className = "bd-tag-ed-msg erro"; return; }
          h._o.lista = r.d.etiquetas || [];
          fillChips(h, h._o.lista, { link: o.tipo === "post", b: o.b });
          if (typeof o.onChange === "function") { try { o.onChange(h._o.lista); } catch (e) {} }
          closeEd();
        }).catch(function () { save.disabled = false; msg.textContent = "Falha de rede."; msg.className = "bd-tag-ed-msg erro"; });
      });
      var anchor = btn.closest("li") || btn.parentNode;
      anchor.classList.add("bd-tag-anchor");
      anchor.appendChild(node);
      btn.setAttribute("aria-expanded", "true");
      openEd = { node: node, btn: btn };
    });
    return btn;
  }

  // SSR: <div class="bd-tags-row" data-etiquetas='{"tipo","id","b","lista","editavel","adm"}'>chips</div>
  function hydrate(root) {
    (root || document).querySelectorAll("[data-etiquetas]").forEach(function (n) {
      var o; try { o = JSON.parse(n.getAttribute("data-etiquetas")); } catch (e) { return; }
      n.removeAttribute("data-etiquetas");
      clear(n);
      var h = host(o);
      n.appendChild(h);
      if (o.editavel) { n.appendChild(document.createTextNode(" ")); n.appendChild(el("span", { class: "bd-tag-anchor" }, editButton(h, o))); }
      n.hidden = !(o.lista && o.lista.length) && !o.editavel;
    });
  }
  window.BDEtiquetas = { host: host, chips: function (list, o) { return fillChips(el("span", { class: "bd-tags" }), list, o || {}); }, picker: picker, editButton: editButton, available: available, hydrate: hydrate, version: V };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { hydrate(document); });
  else hydrate(document);
})();
