// MOR-39 — moderação: aba "Avatar". Avatar ASCII de cada b/ que o ADM gere, com o mesmo editor do avatar de perfil
// (/ascii-editor.js: cores, até 4 camadas, quadro transparente). O servidor revalida tudo (functions/_lib/ascii.js).
(function () {
  "use strict";
  var sel = document.getElementById("mod-bav-escopo");
  var status = document.getElementById("mod-bav-status");
  var atual = document.getElementById("mod-bav-atual");
  var tools = document.getElementById("mod-bav-tools");
  var msg = document.getElementById("mod-bav-msg");
  var host = document.getElementById("mod-bav-editor");
  if (!sel || !atual || !host || !window.BDAsciiEditor || !window.BDAccount) return;
  var AU = window.BDAsciiEditor.util;
  var data = null, ed = null, loaded = false;
  var foco = "";
  try { foco = (new URLSearchParams(location.search).get("b") || "").toLowerCase(); } catch (e) {}

  function el(tag, attrs) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) if (attrs[k] != null && attrs[k] !== false) { if (k === "class") n.className = attrs[k]; else n.setAttribute(k, attrs[k]); }
    for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c == null || c === false) continue; n.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c); }
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function st(t, k) { status.textContent = t || ""; status.className = "mod-status" + (k ? " " + k : ""); }
  function say(t, k) { msg.textContent = t || ""; msg.className = "ascii-status" + (k ? " " + k : ""); }
  function req(method, url, body) {
    var o = { method: method, credentials: "same-origin", headers: { Accept: "application/json" } };
    if (body !== undefined) { o.headers["Content-Type"] = "application/json"; o.body = JSON.stringify(body); }
    return fetch(url, o).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { res: r, d: d }; }); });
  }
  function pre(av) { var p = el("span", { class: "av-pre" }); window.BDAccount.colorize(p, av.arte, av.cores || null); return p; }
  // Ícones iguais aos das páginas (b/base.js): avatar com quadro transparente ou o "b" laranja.
  var BOX = { b: [64, 60], md: [60, 56], xs: [44, 40] };
  function fit(arte, size) {
    var bx = BOX[size], lines = String(arte || "").split("\n"), cols = 1;
    lines.forEach(function (l) { cols = Math.max(cols, Array.from(l).length); });
    return "--av-scale:" + Math.max(0.3, Math.min(1.1, (bx[0] - 6) / (cols * 6.02), (bx[1] - 6) / (Math.max(1, lines.length) * 11))).toFixed(3);
  }
  function icon(av, size) {
    var cls = "or-b-icon or-b-icon-" + size;
    return av && av.arte ? el("span", { class: cls + " ascii-avatar", "aria-hidden": "true", style: fit(av.arte, size) }, pre(av)) : el("span", { class: cls + " or-b-tile", "aria-hidden": "true" }, "b");
  }
  function headIcon(av) {
    return av && av.arte ? el("span", { class: "or-snoo or-snoo-art ascii-avatar ascii-avatar-b", "aria-hidden": "true", style: fit(av.arte, "b") }, pre(av)) : el("span", { class: "or-snoo mod-bav-snoo", "aria-hidden": "true" }, "b");
  }
  // Pré-visualização dos 3 lugares onde o avatar aparece.
  function previews(slug, av) {
    return el("div", { class: "mod-bav-previews" },
      el("div", { class: "avatar-preview-item" }, el("div", { class: "mod-bav-head" }, headIcon(av), el("strong", { class: "mod-bav-head-name" }, slug)), el("span", null, "cabeçalho da b/")),
      el("div", { class: "avatar-preview-item" }, el("div", { class: "mod-bav-sub" }, icon(av, "md"), el("strong", null, "b/" + slug)), el("span", null, "lista de comunidades")),
      el("div", { class: "avatar-preview-item" }, el("div", { class: "mod-bav-painel" }, icon(av, "xs"), el("strong", null, "b/" + slug)), el("span", null, "painel lateral")));
  }
  function cur() { var s = sel.value; return (data && data.comunidades || []).filter(function (c) { return c.slug === s; })[0] || null; }

  function render() {
    clear(atual); clear(tools); clear(host); ed = null;
    var c = cur();
    if (!c) return;
    atual.appendChild(previews(c.slug, c.avatar));
    tools.hidden = false;
    tools.appendChild(el("button", { type: "button", class: "mod-btn", id: "mod-bav-editar" }, c.avatar ? "Editar avatar" : "Criar avatar"));
    tools.firstChild.addEventListener("click", function () { openEditor(c); });
    if (c.avatar) {
      var rm = el("button", { type: "button", class: "mod-btn danger", id: "mod-bav-remover" }, "Remover avatar");
      rm.addEventListener("click", function () { remove(c, rm); });
      tools.appendChild(rm);
    }
    tools.appendChild(el("a", { class: "mod-btn secondary", href: "/b/" + c.slug + "/", style: "text-decoration:none;display:inline-block;" }, "Ver b/" + c.slug));
  }

  function openEditor(c) {
    if (ed) return;
    tools.hidden = true; say("");
    var start = c.camadas && c.camadas.length ? c.camadas : c.avatar ? [{ arte: c.avatar.arte, cores: c.avatar.cores, visivel: true }] : null;
    var save = el("button", { type: "button", class: "ascii-btn", id: "mod-bav-salvar" }, "Salvar");
    var cancel = el("button", { type: "button", class: "ascii-btn secondary", id: "mod-bav-cancelar" }, "Cancelar");
    ed = window.BDAsciiEditor.create({
      prefix: "bav", title: "Avatar ASCII de b/" + c.slug, lines: AU.AVATAR_LINES, cols: AU.AVATAR_COLS, rows: "8", kind: "avatar",
      layers: start,
      hint: el("p", { class: "ascii-hint" }, "Um desenho pequeno, como o ícone da b/. Até " + AU.AVATAR_LINES + " linhas × " + AU.AVATAR_COLS + " colunas; emojis e caracteres largos não."),
      previewLabel: "Pré-visualização (cabeçalho, lista e painel)", previewWrapClass: "avatar-preview-sizes",
      renderPreview: function (preview, sc, info) {
        if (info.dim) preview.appendChild(el("div", { class: "avatar-preview-item avatar-preview-camadas" }, AU.dimBlock(sc, info.active, "nenhuma", false), el("span", null, "camadas")));
        var av = sc.arte ? { arte: sc.arte, cores: sc.cores } : null;
        var p = previews(c.slug, av);
        while (p.firstChild) preview.appendChild(p.firstChild);
      },
      onUpdate: function (api) { save.disabled = api.state().erros.length > 0; },
    });
    ed.node.appendChild(el("div", { class: "ascii-actions" }, save, cancel));
    host.appendChild(ed.node);
    save.disabled = ed.state().erros.length > 0;
    ed.focus();
    cancel.addEventListener("click", function () { render(); });
    save.addEventListener("click", function () {
      ed.update();
      if (ed.state().erros.length) return;
      save.disabled = true; say("Salvando…");
      req("PUT", "/api/comunidades/" + encodeURIComponent(c.slug) + "/avatar", { camadas: ed.layersData() }).then(function (o) {
        if (!o.res.ok) { save.disabled = false; say(o.d.erro || "Não foi possível salvar.", "erro"); return; }
        c.avatar = o.d.avatar; c.camadas = o.d.camadas;
        render(); say("Avatar de b/" + c.slug + " salvo.", "ok");
      }).catch(function () { save.disabled = false; say("Falha de rede.", "erro"); });
    });
  }

  function remove(c, btn) {
    if (!confirm("Remover o avatar ASCII de b/" + c.slug + "? Volta o “b” laranja.")) return;
    btn.disabled = true;
    req("DELETE", "/api/comunidades/" + encodeURIComponent(c.slug) + "/avatar").then(function (o) {
      if (!o.res.ok) { btn.disabled = false; say(o.d.erro || "Não foi possível remover.", "erro"); return; }
      c.avatar = null; c.camadas = null;
      render(); say("Avatar de b/" + c.slug + " removido.", "ok");
    }).catch(function () { btn.disabled = false; say("Falha de rede.", "erro"); });
  }

  function load() {
    if (loaded) return;
    st("carregando…");
    req("GET", "/api/moderation/bavatar").then(function (o) {
      if (!o.res.ok) { st(o.res.status === 401 || o.res.status === 403 ? "" : o.d.erro || "Não foi possível carregar.", o.res.status === 401 || o.res.status === 403 ? "" : "erro"); return; }
      loaded = true;
      data = o.d;
      clear(sel);
      var cs = data.comunidades || [];
      cs.forEach(function (c) { var op = el("option", { value: c.slug }, "b/" + c.slug); if (c.slug === foco) op.selected = true; sel.appendChild(op); });
      var com = cs.filter(function (c) { return c.avatar; }).length;
      st(cs.length ? com + " de " + cs.length + " b/ com avatar" : "Nenhuma b/ para gerir.");
      render();
    }).catch(function () { st("Falha de rede.", "erro"); });
  }
  sel.addEventListener("change", function () { say(""); render(); });
  document.addEventListener("bd-mod-ready", load);
  load();
})();
