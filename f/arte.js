// Ferramenta de arte ASCII (/f/arte.html): camadas, cores, pincel; salva no navegador; exporta; manda para o perfil.
(function () {
  "use strict";
  var E = window.BDAsciiEditor, AU = E.util;
  function el() { return window.BDAccount.el.apply(null, arguments); }
  var KEY = "bd-arte-v1";
  var LINES = 40, COLS = 80;
  var LIM = { arte: { linhas: 16, colunas: 48 }, avatar: { linhas: 8, colunas: 16 } };
  var host = document.getElementById("arte-editor-host");
  var prevHost = document.getElementById("arte-preview-host");
  var autosaveEl = document.getElementById("arte-autosave");
  var exportSt = document.getElementById("arte-export-status");
  var perfilBody = document.getElementById("arte-perfil-body");
  var perfilSt = document.getElementById("arte-perfil-status");
  if (!host || !E) return;

  function st(node, text, kind) { node.textContent = text || ""; node.className = "arte-status" + (kind ? " " + kind : ""); }

  var user = null, buttons = [];
  var saveTimer = null;
  function saveSoon() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveTimer = null;
      try {
        localStorage.setItem(KEY, ed.snapshot());
        autosaveEl.textContent = "Salvo neste navegador às " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + ".";
        autosaveEl.setAttribute("data-salvo", "1");
      } catch (e) { autosaveEl.textContent = "Não deu para salvar neste navegador (armazenamento cheio ou bloqueado)."; }
    }, 300);
  }

  var ed = E.create({
    prefix: "arte", title: "Desenho", lines: LINES, cols: COLS, rows: "16", kind: "livre", tools: true,
    hint: el("p", { class: "ascii-hint" }, "Até " + LINES + " linhas × " + COLS + " colunas por camada. Texto puro e fonte monoespaçada; caracteres de caixa como ",
      el("code", null, "┌─┐│└┘╔═╗"), " são permitidos; emojis e caracteres largos não (quebram o alinhamento). Ctrl+Z desfaz."),
    placeholder: "Desenhe com texto aqui. Use as camadas para sobrepor detalhes.",
    previewHost: prevHost, previewLabel: "Resultado", previewWrapClass: "arte-preview-wrap",
    minFont: 7, maxFont: 20, minCols: 24,
    renderPreview: function (preview, sc, info) {
      preview.appendChild(info.dim ? AU.dimBlock(sc, info.active, "nenhuma", false) : AU.asciiBlock(sc.arte, "nenhuma", "Arte ASCII", sc.cores));
    },
    onChange: saveSoon,
    onUpdate: function () { syncButtons(); },
  });
  host.appendChild(ed.node);
  try { var saved = localStorage.getItem(KEY); if (saved && ed.restore(saved)) autosaveEl.textContent = "Desenho recuperado deste navegador."; } catch (e) {}

  // ---------- Exportar ----------
  function texto() { var s = ed.state(); return s ? s.texto : ""; }
  function copyText(t, msg) {
    if (!t) { st(exportSt, "O desenho está vazio.", "erro"); return; }
    function fallback() {
      var a = el("textarea", { class: "arte-copy-tmp", readonly: "readonly" }); a.value = t; document.body.appendChild(a); a.select();
      var ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(a);
      st(exportSt, ok ? msg : "Não deu para copiar automaticamente; selecione o texto do resultado e copie.", ok ? "ok" : "erro");
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { st(exportSt, msg, "ok"); }, fallback);
    else fallback();
  }
  function download(blob, name) {
    var url = URL.createObjectURL(blob), a = el("a", { href: url, download: name });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  document.getElementById("arte-copiar").addEventListener("click", function () { copyText(texto(), "Texto copiado."); });
  document.getElementById("arte-copiar-bloco").addEventListener("click", function () { var t = texto(); copyText(t && "```\n" + t + "\n```", "Copiado como bloco de código."); });
  document.getElementById("arte-baixar-txt").addEventListener("click", function () {
    var t = texto(); if (!t) { st(exportSt, "O desenho está vazio.", "erro"); return; }
    download(new Blob([t + "\n"], { type: "text/plain;charset=utf-8" }), "arte-ascii.txt"); st(exportSt, "Arquivo .txt gerado.", "ok");
  });
  function bgOf(n) { while (n && n.nodeType === 1) { var c = getComputedStyle(n).backgroundColor; if (c && c !== "transparent" && !/rgba\(\d+, \d+, \d+, 0\)/.test(c)) return c; n = n.parentNode; } return "#ffffff"; }
  document.getElementById("arte-baixar-png").addEventListener("click", function () {
    var s = ed.state(); if (!s || !s.texto) { st(exportSt, "O desenho está vazio.", "erro"); return; }
    var lines = s.comp.lines, ml = String(s.comp.cores || "").split("\n");
    var pre = ed.preview.querySelector("pre") || ed.preview;
    var fg = getComputedStyle(pre).color, bg = bgOf(pre), pal = {};
    var probe = el("span", { class: "arte-probe" }, "x"); pre.parentNode.appendChild(probe);
    for (var k = 1; k <= 8; k++) { probe.className = "arte-probe ac-" + k; pal[k] = getComputedStyle(probe).color; }
    probe.parentNode.removeChild(probe);
    var fs = 18, lh = Math.round(fs * 1.25), pad = 16, scale = 2;
    var cv = document.createElement("canvas"), cx = cv.getContext("2d");
    var font = fs + 'px "DejaVu Sans Mono", Menlo, Consolas, "Courier New", monospace';
    cx.font = font; var cw = cx.measureText("M").width;
    var cols = lines.reduce(function (m, l) { return Math.max(m, AU.cpLen(l)); }, 0);
    cv.width = Math.ceil((cols * cw + pad * 2) * scale); cv.height = Math.ceil((lines.length * lh + pad * 2) * scale);
    cx.scale(scale, scale); cx.fillStyle = bg; cx.fillRect(0, 0, cv.width, cv.height);
    cx.font = font; cx.textBaseline = "top";
    lines.forEach(function (line, i) {
      Array.from(line).forEach(function (ch, j) { if (/\s/.test(ch)) return; var c = (ml[i] || "").charAt(j); cx.fillStyle = /^[1-8]$/.test(c) ? pal[c] : fg; cx.fillText(ch, pad + j * cw, pad + i * lh + (lh - fs) / 2); });
    });
    cv.toBlob(function (b) { if (!b) { st(exportSt, "Não deu para gerar a imagem.", "erro"); return; } download(b, "arte-ascii.png"); st(exportSt, "Imagem .png gerada (cores do tema atual).", "ok"); }, "image/png");
  });
  document.getElementById("arte-novo").addEventListener("click", function () {
    if (texto() && !confirm("Começar um desenho novo? O atual será apagado deste navegador (dá para desfazer).")) return;
    ed.setLayers([{ arte: "", cores: null, visivel: true }]); ed.focus();
  });

  // ---------- Usar no perfil ----------
  // As camadas vão como estão (o servidor valida e recompõe). As linhas vazias do topo, comuns a todas, são tiradas.
  function fit(kind) {
    var s = ed.state(), L = LIM[kind];
    var data = ed.layersData();
    var top = Infinity;
    data.forEach(function (l) { var ls = l.arte.split("\n"); for (var i = 0; i < ls.length; i++) if (/\S/.test(ls[i])) { top = Math.min(top, i); break; } });
    if (top === Infinity) top = 0;
    var h = 0, w = 0;
    var camadas = data.map(function (l) {
      var ls = l.arte.split("\n").slice(top), ms = l.cores ? l.cores.split("\n").slice(top) : null;
      while (ls.length && !ls[ls.length - 1]) { ls.pop(); if (ms) ms.pop(); }
      if (ls.length > h) h = ls.length;
      ls.forEach(function (x) { var n = AU.cpLen(x); if (n > w) w = n; });
      return { arte: ls.join("\n"), cores: ms && /[1-8]/.test(ms.join("")) ? ms.join("\n") : null, visivel: l.visivel };
    });
    var ok = s && !s.erros.length && h <= L.linhas && w <= L.colunas;
    return { ok: ok, camadas: camadas, h: h, w: w, L: L, vazio: !s || !s.texto, erros: s ? s.erros.length : 0 };
  }
  function syncButtons() {
    buttons.forEach(function (b) {
      var f = fit(b.kind);
      b.btn.disabled = !f.ok;
      b.info.textContent = f.vazio ? "Desenhe algo primeiro." : f.erros ? "Corrija os avisos do editor primeiro." :
        f.ok ? "Cabe (" + f.h + " × " + f.w + " de até " + f.L.linhas + " × " + f.L.colunas + ")." :
        "Não cabe: até " + f.L.linhas + " linhas × " + f.L.colunas + " colunas, contando camadas ocultas (agora " + f.h + " × " + f.w + ").";
      b.info.className = "arte-cabe" + (f.ok ? " ok" : "");
    });
  }
  function api(method, url, body) {
    return fetch(url, { method: method, credentials: "same-origin", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (d) { return { res: res, data: d }; }); });
  }
  function profilePath(anon) { return "/api/users/" + encodeURIComponent(anon ? "anônimo" : user.username); }
  function send(kind, anon, btn) {
    var f = fit(kind); if (!f.ok) return;
    var alvo = anon ? "do perfil >>anônimo" : "do seu perfil";
    if (!confirm("Substituir " + (kind === "arte" ? "a arte" : "o avatar") + " " + alvo + " por este desenho?")) return;
    btn.disabled = true; st(perfilSt, "Enviando…");
    var qs = anon ? "?perfil=anonimo" : "";
    var pre = kind === "arte" ? api("GET", profilePath(anon)).then(function (o) { return (o.data && o.data.ascii && o.data.ascii.moldura) || "simples"; }) : Promise.resolve(null);
    pre.then(function (moldura) {
      var body = kind === "arte" ? { camadas: f.camadas, moldura: moldura } : { camadas: f.camadas };
      return api("PUT", (kind === "arte" ? "/api/perfil/ascii" : "/api/perfil/avatar") + qs, body);
    }).then(function (o) {
      syncButtons();
      if (!o.res.ok) { st(perfilSt, (o.data && o.data.erro) || "Não foi possível enviar.", "erro"); return; }
      while (perfilSt.firstChild) perfilSt.removeChild(perfilSt.firstChild);
      perfilSt.className = "arte-status ok";
      perfilSt.appendChild(document.createTextNode((kind === "arte" ? "Arte" : "Avatar") + " " + (anon ? "do >>anônimo" : "do perfil") + " atualizado. "));
      perfilSt.appendChild(el("a", { href: anon ? "/@anônimo" : "/@" + user.username }, "Ver o perfil"));
    }).catch(function () { syncButtons(); st(perfilSt, "Falha de rede.", "erro"); });
  }
  function load(kind) {
    api("GET", profilePath(false)).then(function (o) {
      var list = o.data && o.data[kind === "arte" ? "ascii_camadas" : "avatar_camadas"];
      if (!list || !list.length) { st(perfilSt, kind === "arte" ? "Seu perfil ainda não tem arte." : "Seu perfil ainda não tem avatar.", "erro"); return; }
      if (texto() && !confirm("Trocar o desenho atual pel" + (kind === "arte" ? "a arte" : "o avatar") + " do seu perfil? (dá para desfazer)")) return;
      ed.setLayers(list); st(perfilSt, (kind === "arte" ? "Arte" : "Avatar") + " do perfil aberto aqui.", "ok");
    }).catch(function () { st(perfilSt, "Falha de rede.", "erro"); });
  }
  function row(id, label, kind, anon) {
    var btn = el("button", { type: "button", class: "tool-btn" + (anon ? "" : " tool-btn-primary"), id: id }, label);
    var info = el("p", { class: "arte-cabe", id: id + "-cabe" });
    btn.addEventListener("click", function () { send(kind, anon, btn); });
    buttons.push({ btn: btn, info: info, kind: kind });
    return el("div", { class: "arte-perfil-row" }, btn, info);
  }
  window.BDAccount.me().then(function (u) {
    user = u;
    while (perfilBody.firstChild) perfilBody.removeChild(perfilBody.firstChild);
    if (!u) {
      perfilBody.appendChild(el("p", { class: "tool-lead", id: "arte-perfil-deslogado" }, "Dá para desenhar, copiar e baixar sem conta. Para usar o desenho como arte ou avatar do perfil, ",
        el("a", { href: "/entrar" }, "entre na sua conta"), "."));
      return;
    }
    perfilBody.appendChild(el("p", { class: "tool-lead" }, "Manda as camadas para o perfil (o desenho precisa caber no limite)."));
    perfilBody.appendChild(row("arte-usar-arte", "Usar como arte do perfil", "arte", false));
    perfilBody.appendChild(row("arte-usar-avatar", "Usar como avatar", "avatar", false));
    if (u.is_site_admin) {
      perfilBody.appendChild(el("p", { class: "tool-lead arte-adm" }, "ADM do site: também dá para mandar para o perfil coletivo >>anônimo."));
      perfilBody.appendChild(row("arte-usar-anon-arte", "Arte do >>anônimo", "arte", true));
      perfilBody.appendChild(row("arte-usar-anon-avatar", "Avatar do >>anônimo", "avatar", true));
    }
    var openA = el("button", { type: "button", class: "tool-btn", id: "arte-abrir-arte" }, "Abrir a arte do meu perfil");
    var openV = el("button", { type: "button", class: "tool-btn", id: "arte-abrir-avatar" }, "Abrir o meu avatar");
    openA.addEventListener("click", function () { load("arte"); });
    openV.addEventListener("click", function () { load("avatar"); });
    perfilBody.appendChild(el("div", { class: "tool-actions arte-abrir" }, openA, openV));
    syncButtons();
  });
})();
