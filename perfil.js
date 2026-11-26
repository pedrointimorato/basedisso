(function () {
  "use strict";

  var PAGE_LABELS = {
    "/adm": { href: "/b/adm/", label: "b/adm" },
    "/b/adm": { href: "/b/adm/", label: "b/adm" },
    "/s": { href: "/s/", label: "sátiras" },
    "/s/biblia-amarela": { href: "/s/biblia-amarela.html", label: "A Bíblia Amarela" },
  };

  function el() {
    return window.BDAccount.el.apply(null, arguments);
  }

  function relativeTime(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
    } catch (e) {
      return iso;
    }
  }

  function pageLink(page) {
    var info = PAGE_LABELS[page];
    if (!info && page && /^\/b\/[a-z0-9_-]+\/p\/[0-9a-f-]+$/i.test(page)) {
      info = { href: page, label: page.replace(/^\/b\//, "b/") };
    }
    if (!info) info = { href: page || "#", label: page || "página" };
    return el("a", { href: info.href }, info.label);
  }

  // ---------- Arte ASCII (mesmas regras de functions/_lib/ascii.js) ----------
  var autoOpened = false;
  var ASCII_LINES = 16;
  var ASCII_COLS = 48;
  var STRIP_RE = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u00AD\u200B-\u200F\u2028\u2029\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\uFFF9-\uFFFB]/g;
  var MARK_RE = null, WIDE_RE = null;
  try {
    MARK_RE = new RegExp("\\p{M}", "gu");
    WIDE_RE = new RegExp("[\\p{Extended_Pictographic}\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Hangul}\\u3000-\\u303F\\uFF00-\\uFF60\\uFFE0-\\uFFE6\\u{1F000}-\\u{1FAFF}\\uFE0F]", "u");
  } catch (e) { /* navegador antigo: o servidor valida */ }

  function cpLen(str) { return Array.from(str).length; }

  var AVATAR_LINES = 8;
  var AVATAR_COLS = 16;

  // keepLead: camada (linhas vazias do topo contam para a posição; pode ficar vazia).
  function cleanAscii(raw, maxLines, maxCols, keepLead) {
    var ML = maxLines || ASCII_LINES, MC = maxCols || ASCII_COLS;
    var s = String(raw == null ? "" : raw).replace(/\r\n?/g, "\n").replace(/\t/g, "    ");
    try { s = s.normalize("NFC"); } catch (e) {}
    s = s.replace(STRIP_RE, "");
    if (MARK_RE) s = s.replace(MARK_RE, "");
    var lines = s.split("\n").map(function (l) { return l.replace(/\s+$/, ""); });
    while (lines.length && lines[lines.length - 1] === "") lines.pop();
    if (!keepLead) while (lines.length && lines[0] === "") lines.shift();
    var cols = 0, longest = 0, errs = [];
    lines.forEach(function (l, i) {
      var n = cpLen(l);
      if (n > cols) { cols = n; longest = i + 1; }
    });
    if (WIDE_RE && WIDE_RE.test(s)) errs.push("Emojis e caracteres largos não são aceitos (quebram o alinhamento).");
    if (!lines.length && !keepLead) errs.push("A arte está vazia.");
    if (lines.length > ML) errs.push("Máximo de " + ML + " linhas (tem " + lines.length + ").");
    if (cols > MC) errs.push("A linha " + longest + " tem " + cols + " colunas; o máximo é " + MC + ".");
    return { arte: lines.join("\n"), lines: lines, linhas: lines.length, colunas: cols, erros: errs };
  }

  function pad(str, n) {
    var len = cpLen(str);
    return len >= n ? str : str + new Array(n - len + 1).join(" ");
  }

  function framedText(lines, moldura) {
    if (moldura === "nenhuma") return { text: lines.join("\n"), cols: lines.reduce(function (m, l) { return Math.max(m, cpLen(l)); }, 0) };
    var w = lines.reduce(function (m, l) { return Math.max(m, cpLen(l)); }, 0);
    var bar = new Array(w + 3).join("─");
    var out = ["┌" + bar + "┐"];
    lines.forEach(function (l) { out.push("│ " + pad(l, w) + " │"); });
    out.push("└" + bar + "┘");
    return { text: out.join("\n"), cols: w + 4 };
  }

  // Bloco <pre> com textContent (nunca innerHTML): o texto é sempre escapado.
  function framedMask(lines, mask, moldura) {
    if (!mask) return null;
    var ml = String(mask).split("\n");
    if (moldura === "nenhuma") return ml.join("\n");
    var w = lines.reduce(function (m, l) { return Math.max(m, cpLen(l)); }, 0);
    var dots = function (n) { return new Array(n + 1).join("."); };
    var out = [dots(w + 4)];
    lines.forEach(function (l, i) { var m = (ml[i] || "").slice(0, cpLen(l)); out.push(".." + m + dots(w - m.length) + ".."); });
    out.push(dots(w + 4));
    return out.join("\n");
  }

  function asciiBlock(arte, moldura, label, cores) {
    var lines = String(arte || "").split("\n");
    var f = framedText(lines, moldura);
    var pre = el("pre", { class: "ascii-art" + (moldura === "nenhuma" ? " sem-moldura" : " com-moldura"), role: "img", "aria-label": label || "Arte ASCII" });
    window.BDAccount.colorize(pre, f.text, framedMask(lines, cores, moldura));
    pre.style.setProperty("--cols", String(Math.max(f.cols, 12)));
    return el("div", { class: "ascii-wrap" }, pre);
  }

  function api(method, url, body) {
    var opts = { method: method, credentials: "same-origin", headers: { Accept: "application/json" } };
    if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    return fetch(url, opts).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) { return { res: res, data: data }; });
    });
  }

  function avatarPreview(arte, size, cores) {
    var n = window.BDAccount.avatarNode({ username: "", avatar: arte, avatar_cores: cores || null }, size); if (n) { n.removeAttribute("href"); } return n;
  }

  // ---------- Pintura (cores por caractere) ----------
  // A máscara de cores fica alinhada ao texto CRU do textarea (um código por caractere digitado);
  // editar o texto desloca as cores junto (prefixo/sufixo comuns preservados).
  var STRIP1 = new RegExp("^" + STRIP_RE.source + "$");
  var MARK1 = null;
  try { MARK1 = new RegExp("^\\p{M}$", "u"); } catch (e) {}
  function cellsFrom(rawChars, keepLead) {
    var lines = [[]];
    for (var i = 0; i < rawChars.length; i++) {
      var ch = rawChars[i];
      if (ch === "\r") { if (rawChars[i + 1] === "\n") continue; lines.push([]); continue; }
      if (ch === "\n") { lines.push([]); continue; }
      if (ch === "\t") { for (var t = 0; t < 4; t++) lines[lines.length - 1].push({ ch: " ", raw: i }); continue; }
      if (STRIP1.test(ch)) continue;
      if (MARK1 && MARK1.test(ch)) continue;
      lines[lines.length - 1].push({ ch: ch, raw: i });
    }
    lines = lines.map(function (l) { var n = l.length; while (n && /\s/.test(l[n - 1].ch)) n--; return l.slice(0, n); });
    while (lines.length && !lines[lines.length - 1].length) lines.pop();
    if (!keepLead) while (lines.length && !lines[0].length) lines.shift();
    return lines;
  }
  function maskOf(cells, mk) {
    var any = false;
    var s = cells.map(function (l) {
      return l.map(function (c) { var v = /\s/.test(c.ch) ? "." : mk[c.raw] || "."; if (v !== ".") any = true; return v; }).join("");
    }).join("\n");
    return any ? s : null;
  }
  // caret: posição (em code points) do cursor depois da edição; desempata repetições ("A" digitado antes de "A").
  // fill: cor do pincel para o texto novo (digitado, colado ou que substituiu uma seleção); espaços ficam padrão.
  function shiftMask(oldChars, newChars, mk, caret, fill) {
    var a = oldChars.length, b = newChars.length;
    var sMax = caret == null ? Math.min(a, b) : Math.max(0, Math.min(b - caret, a));
    var s = 0;
    while (s < sMax && oldChars[a - 1 - s] === newChars[b - 1 - s]) s++;
    var p = 0;
    while (p < a - s && p < b - s && oldChars[p] === newChars[p]) p++;
    var mid = [];
    for (var i = p; i < b - s; i++) mid.push(fill && fill !== "." && !/\s/.test(newChars[i]) ? fill : ".");
    return mk.slice(0, p).concat(mid, mk.slice(a - s));
  }
  function maskToRaw(arte, cores) {
    var mk = [], al = String(arte || "").split("\n"), ml = String(cores || "").split("\n");
    al.forEach(function (l, i) { if (i) mk.push("."); var n = cpLen(l), m = ml[i] || ""; for (var j = 0; j < n; j++) mk.push(/^[1-8]$/.test(m.charAt(j)) ? m.charAt(j) : "."); });
    return mk;
  }

  // ---------- Camadas (mesma regra de functions/_lib/ascii.js) ----------
  // list: [{ text, mask, idx }] de baixo para cima. Um caractere que não é espaço cobre o de baixo;
  // espaços são transparentes. origin: índice da camada de cada caractere ('.' = espaço).
  var LAYERS_MAX = 4;
  function compositeC(list) {
    var L = list.map(function (l) { return { lines: String(l.text || "").split("\n").map(function (x) { return Array.from(x); }), ml: String(l.mask || "").split("\n"), idx: l.idx }; });
    var rows = 0;
    L.forEach(function (l) { var n = l.lines.length === 1 && !l.lines[0].length ? 0 : l.lines.length; if (n > rows) rows = n; });
    var art = [], mask = [], orig = [];
    for (var r = 0; r < rows; r++) {
      var w = 0;
      L.forEach(function (l) { if (l.lines[r] && l.lines[r].length > w) w = l.lines[r].length; });
      var a = [], m = "", o = "";
      for (var c = 0; c < w; c++) {
        var ch = " ", code = ".", oi = ".";
        for (var k = L.length - 1; k >= 0; k--) {
          var x = L[k].lines[r] && L[k].lines[r][c];
          if (x != null && !/\s/.test(x)) { ch = x; var mc = (L[k].ml[r] || "").charAt(c); code = /^[1-8]$/.test(mc) ? mc : "."; oi = String(L[k].idx); break; }
        }
        a.push(ch); m += code; o += oi;
      }
      var n = a.length; while (n && /\s/.test(a[n - 1])) n--;
      art.push(a.slice(0, n).join("")); mask.push(m.slice(0, n)); orig.push(o.slice(0, n));
    }
    while (art.length && art[art.length - 1] === "") { art.pop(); mask.pop(); orig.pop(); }
    while (art.length && art[0] === "") { art.shift(); mask.shift(); orig.shift(); }
    var any = mask.some(function (x) { return /[1-8]/.test(x); });
    return { arte: art.join("\n"), cores: any ? mask.join("\n") : null, origem: orig.join("\n"), lines: art };
  }
  // Pré-visualização com as outras camadas esmaecidas (só textContent).
  function dimBlock(comp, active, moldura, framed) {
    var lines = comp.lines;
    var f = framed ? framedText(lines, moldura) : { text: comp.arte, cols: lines.reduce(function (m, l) { return Math.max(m, cpLen(l)); }, 0) };
    var fm = framed ? framedMask(lines, comp.cores || lines.map(function (l) { return new Array(cpLen(l) + 1).join("."); }).join("\n"), moldura) : (comp.cores || "");
    var fo = framed ? framedMask(lines, comp.origem, moldura) : comp.origem;
    var pre = el("pre", { class: "ascii-art ascii-layer-preview" + (framed ? (moldura === "nenhuma" ? " sem-moldura" : " com-moldura") : " sem-moldura"), role: "img", "aria-label": "Pré-visualização com as outras camadas esmaecidas" });
    var tl = f.text.split("\n"), ml = String(fm || "").split("\n"), ol = String(fo || "").split("\n");
    tl.forEach(function (line, i) {
      if (i) pre.appendChild(document.createTextNode("\n"));
      var chars = Array.from(line), run = "", key = "";
      function flush() { if (!run) return; var cls = key.split("|"); var sp = document.createElement("span"); sp.className = [cls[0] !== "." ? "ac-" + cls[0] : "", cls[1] === "d" ? "ascii-dim" : ""].join(" ").trim(); if (!sp.className) pre.appendChild(document.createTextNode(run)); else { sp.textContent = run; pre.appendChild(sp); } run = ""; }
      for (var j = 0; j < chars.length; j++) {
        var c = (ml[i] || "").charAt(j); if (!/^[1-8]$/.test(c) || /\s/.test(chars[j])) c = ".";
        var o = (ol[i] || "").charAt(j); var d = /^[0-9]$/.test(o) && o !== String(active) ? "d" : "";
        var k2 = c + "|" + d; if (k2 !== key) { flush(); key = k2; } run += chars[j];
      }
      flush();
    });
    pre.style.setProperty("--cols", String(Math.max(f.cols, 12)));
    return el("div", { class: "ascii-wrap" }, pre);
  }

  var KINDS = {
    arte: {
      prefix: "ascii", title: "Arte ASCII do perfil", lines: ASCII_LINES, cols: ASCII_COLS, rows: "12",
      api: "/api/perfil/ascii", modTipo: "arte", frames: true,
      addLabel: "Adicionar arte ASCII", editLabel: "Editar arte ASCII", removeLabel: "Remover arte",
      savedMsg: "Arte salva.", removedMsg: "Arte removida.", confirmOwn: "Remover a arte ASCII do seu perfil?",
      admLabel: "Remover arte (ADM)", admConfirm: "Remover a arte ASCII de >>", admMsg: "Arte removida pela moderação.",
    },
    avatar: {
      prefix: "avatar", title: "Avatar ASCII", lines: AVATAR_LINES, cols: AVATAR_COLS, rows: "8",
      api: "/api/perfil/avatar", modTipo: "avatar", frames: false,
      addLabel: "Adicionar avatar ASCII", editLabel: "Editar avatar ASCII", removeLabel: "Remover avatar",
      savedMsg: "Avatar salvo.", removedMsg: "Avatar removido.", confirmOwn: "Remover o seu avatar ASCII?",
      admLabel: "Remover avatar (ADM)", admConfirm: "Remover o avatar ASCII de >>", admMsg: "Avatar removido pela moderação.",
    },
  };

  function renderAsciiSection(root, data, reload, flash) {
    var u = data.usuario;
    var alvoQs = data.perfil_alvo ? "?perfil=" + encodeURIComponent(data.perfil_alvo) : "";
    var art = data.ascii;
    var current = { arte: data.ascii, avatar: data.avatar };
    var section = el("section", { class: "profile-ascii", id: "perfil-ascii" });
    if (art) section.appendChild(asciiBlock(art.arte, art.moldura, "Arte ASCII de >>" + u.username, art.cores));
    var status = el("p", { class: "ascii-status", role: "status" });
    var tools = el("div", { class: "ascii-tools" });
    var editorHost = el("div", { class: "ascii-editor-host" });
    if (data.pode_editar_ascii) {
      ["avatar", "arte"].forEach(function (k) {
        var K = KINDS[k];
        tools.appendChild(el("button", { type: "button", class: "ascii-btn" + (k === "avatar" ? " secondary" : ""), id: K.prefix + "-editar",
          onClick: function () { openEditor(k); } }, current[k] ? K.editLabel : K.addLabel));
      });
    }
    if (data.pode_remover_ascii && !data.pode_editar_ascii) {
      ["avatar", "arte"].forEach(function (k) {
        var K = KINDS[k];
        if (!current[k]) return;
        tools.appendChild(el("button", { type: "button", class: "ascii-btn danger", id: K.prefix + "-remover-adm", onClick: function (ev) {
          if (!confirm(K.admConfirm + u.username + "? (ação de ADM)")) return;
          ev.target.disabled = true;
          api("DELETE", "/api/moderation/ascii/" + encodeURIComponent(u.username) + "?tipo=" + K.modTipo).then(function (out) {
            if (out.res.ok) reload(K.admMsg);
            else { ev.target.disabled = false; setSt(status, (out.data && out.data.erro) || "Não foi possível remover.", "erro"); }
          }).catch(function () { ev.target.disabled = false; setSt(status, "Falha de rede.", "erro"); });
        } }, K.admLabel));
      });
    }
    if (tools.firstChild) section.appendChild(tools);
    section.appendChild(status);
    section.appendChild(editorHost);
    if (!art && !tools.firstChild && !flash) return null;

    function openEditor(kind) {
      var K = KINDS[kind];
      var existing = current[kind];
      if (editorHost.querySelector(".ascii-editor")) return;
      tools.hidden = true;
      var ta = el("textarea", { id: K.prefix + "-input", class: "ascii-input" + (kind === "avatar" ? " avatar-input" : ""), rows: K.rows, wrap: "off", spellcheck: "false",
        autocapitalize: "off", autocomplete: "off", "aria-label": K.title, maxlength: "4000",
        placeholder: "Desenhe com texto. Até " + K.lines + " linhas × " + K.cols + " colunas." });
      // Camadas de baixo para cima; artes antigas chegam como uma camada só (igual à arte).
      var srvLayers = data[kind === "arte" ? "ascii_camadas" : "avatar_camadas"];
      var layers = (srvLayers && srvLayers.length ? srvLayers : existing ? [{ arte: existing.arte, cores: existing.cores, visivel: true }] : [{ arte: "", cores: null, visivel: true }])
        .slice(0, LAYERS_MAX).map(function (l) { return { raw: String(l.arte || ""), mk: l.cores ? maskToRaw(l.arte, l.cores) : Array.from(String(l.arte || "")).map(function () { return "."; }), visivel: l.visivel !== false }; });
      var active = layers.length - 1;
      var viewMode = "tudo";
      ta.value = layers[active].raw;
      var rawChars = Array.from(ta.value);
      var mk = layers[active].mk.slice();
      var brush = "."; // padrão: digitar sem cor, como antes
      var NOMES = { ".": "padrão" };
      window.BDAccount.asciiCores.forEach(function (c) { NOMES[c.c] = c.nome; });
      var typingDot = el("span", { class: "ascii-typing-dot", "aria-hidden": "true" }, "█");
      var typingName = el("strong", { class: "ascii-typing-name" });
      var typing = el("p", { class: "ascii-typing", id: K.prefix + "-digitando", "aria-live": "polite" }, typingDot, " Digitando em: ", typingName,
        el("span", { class: "ascii-typing-hint" }, " — o texto novo sai nessa cor (espaços nunca têm cor)"));
      var palette = el("div", { class: "ascii-palette", role: "radiogroup", "aria-label": "Pincel de cor", id: K.prefix + "-paleta" });
      var swatches = [];
      function swatch(code, label, cls) {
        var b = el("button", { type: "button", class: "ascii-swatch" + (cls ? " " + cls : ""), role: "radio", "data-cor": code, title: label, "aria-label": label },
          el("span", { class: "ascii-swatch-dot" + (code === "." ? "" : " ac-" + code), "aria-hidden": "true" }, code === "." ? "⌫" : "█"), el("span", { class: "ascii-swatch-name" }, label));
        b.addEventListener("mousedown", function (ev) { ev.preventDefault(); }); // não tira o foco/seleção do textarea
        b.addEventListener("click", function () { brush = code; syncBrush(); });
        swatches.push(b); palette.appendChild(b);
      }
      window.BDAccount.asciiCores.forEach(function (c) { swatch(c.c, c.nome); });
      swatch(".", "padrão / borracha", "is-eraser");
      function syncBrush() {
        swatches.forEach(function (b) { var on = b.getAttribute("data-cor") === brush; b.setAttribute("aria-checked", on ? "true" : "false"); b.classList.toggle("is-on", on); });
        typingName.textContent = NOMES[brush] || "padrão";
        typingName.className = "ascii-typing-name" + (brush !== "." ? " ac-" + brush : "");
        typingDot.className = "ascii-typing-dot" + (brush !== "." ? " ac-" + brush : " is-default");
        typing.className = "ascii-typing" + (brush !== "." ? " has-color" : "");
        ta.classList.remove("ac-caret-1", "ac-caret-2", "ac-caret-3", "ac-caret-4", "ac-caret-5", "ac-caret-6", "ac-caret-7", "ac-caret-8");
        if (brush !== ".") ta.classList.add("ac-caret-" + brush);
      }
      syncBrush();
      var clearColors = el("button", { type: "button", class: "ascii-btn secondary ascii-limpar", id: K.prefix + "-limpar-cores" }, "Limpar cores");
      var grid = el("div", { class: "ascii-paint", id: K.prefix + "-pintura", "aria-label": "Toque ou arraste sobre os caracteres para pintar" });
      var colorsBox = el("div", { class: "ascii-cores" },
        el("p", { class: "ascii-preview-label" }, "Cores — escolha uma cor para digitar nela, ou toque/arraste sobre os caracteres para pintar:"),
        palette, el("div", { class: "ascii-paint-scroll" }, grid), el("div", { class: "ascii-actions" }, clearColors));
      var gridWrap = grid.parentNode;
      var cells = [];
      var painting = false, pending = false;
      function renderGrid() {
        while (grid.firstChild) grid.removeChild(grid.firstChild);
        var maxw = 1;
        cells.slice(0, K.lines + 8).forEach(function (line, li) {
          var row = el("div", { class: "ascii-paint-row" });
          line.slice(0, K.cols + 16).forEach(function (c) {
            var sp = /\s/.test(c.ch);
            var code = sp ? "." : mk[c.raw] || ".";
            row.appendChild(el("span", { class: "ascii-cell" + (sp ? " is-space" : "") + (code !== "." ? " ac-" + code : ""), "data-raw": String(c.raw) }, sp ? " " : c.ch));
          });
          if (!line.length) row.appendChild(document.createTextNode(" "));
          maxw = Math.max(maxw, Math.min(line.length, K.cols + 16));
          grid.appendChild(row);
        });
        grid.style.setProperty("--cols", String(maxw));
        var avail = (grid.parentNode && grid.parentNode.clientWidth) || 320;
        var fs = Math.max(10, Math.min(kind === "avatar" ? 26 : 20, Math.floor((avail - 12) / (Math.max(maxw, kind === "avatar" ? 16 : 24) * 0.62))));
        grid.style.fontSize = fs + "px";
        gridWrap.hidden = !cells.length;
      }
      function paintAt(x, y) {
        var t = document.elementFromPoint(x, y);
        if (!t || !t.classList || !t.classList.contains("ascii-cell") || t.classList.contains("is-space") || !grid.contains(t)) return;
        var raw = Number(t.getAttribute("data-raw"));
        if (mk[raw] === brush) return;
        mk[raw] = brush;
        t.className = "ascii-cell" + (brush !== "." ? " ac-" + brush : "");
        if (!pending) { pending = true; requestAnimationFrame(function () { pending = false; update(true); }); }
      }
      grid.addEventListener("pointerdown", function (ev) { painting = true; try { grid.setPointerCapture(ev.pointerId); } catch (e) {} paintAt(ev.clientX, ev.clientY); ev.preventDefault(); });
      grid.addEventListener("pointermove", function (ev) { if (painting) { paintAt(ev.clientX, ev.clientY); ev.preventDefault(); } });
      ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (n) { grid.addEventListener(n, function () { painting = false; }); });
      // Reserva para navegadores/emulações sem Pointer Events (pintar duas vezes a mesma célula não faz nada).
      grid.addEventListener("mousedown", function (ev) { painting = true; paintAt(ev.clientX, ev.clientY); ev.preventDefault(); });
      grid.addEventListener("mousemove", function (ev) { if (painting) paintAt(ev.clientX, ev.clientY); });
      document.addEventListener("mouseup", function () { painting = false; });
      grid.addEventListener("touchstart", function (ev) { var t = ev.touches[0]; if (!t) return; painting = true; paintAt(t.clientX, t.clientY); ev.preventDefault(); }, { passive: false });
      grid.addEventListener("touchmove", function (ev) { var t = ev.touches[0]; if (t) paintAt(t.clientX, t.clientY); ev.preventDefault(); }, { passive: false });
      grid.addEventListener("touchend", function () { painting = false; });
      clearColors.addEventListener("click", function () { mk = rawChars.map(function () { return "."; }); update(); });
      var counter = el("p", { class: "ascii-counter", id: K.prefix + "-counter", "aria-live": "polite" });
      var layersBox = el("div", { class: "ascii-camadas", id: K.prefix + "-camadas" });
      function commit() { layers[active].raw = ta.value; layers[active].mk = mk.slice(); }
      function load(i) { active = i; ta.value = layers[i].raw; rawChars = Array.from(ta.value); mk = layers[i].mk.slice(); renderLayers(); update(); }
      function hasContent(l) { return /\S/.test(l.raw); }
      function lbtn(cls, label, title, onClick, disabled) {
        var b = el("button", { type: "button", class: "ascii-layer-btn " + cls, title: title, "aria-label": title }, label);
        if (disabled) b.disabled = true;
        b.addEventListener("mousedown", function (ev) { ev.preventDefault(); });
        b.addEventListener("click", onClick);
        return b;
      }
      function renderLayers() {
        while (layersBox.firstChild) layersBox.removeChild(layersBox.firstChild);
        var n = layers.length;
        layersBox.appendChild(el("p", { class: "ascii-preview-label" }, "Camadas (até " + LAYERS_MAX + ") — a de cima cobre a de baixo; espaços são transparentes. O texto, as cores e o pincel valem para a camada ativa."));
        var list = el("ul", { class: "ascii-layer-list", id: K.prefix + "-camadas-lista" });
        for (var i = n - 1; i >= 0; i--) (function (i) {
          var l = layers[i];
          var name = "Camada " + (i + 1) + (n > 1 && i === 0 ? " (base)" : "") + (n > 1 && i === n - 1 ? " (topo)" : "");
          var sel = el("button", { type: "button", class: "ascii-layer-sel", "aria-pressed": i === active ? "true" : "false", "data-i": String(i) }, name, hasContent(l) ? null : el("span", { class: "ascii-layer-empty" }, " · vazia"));
          sel.addEventListener("click", function () { if (i === active) return; commit(); load(i); });
          list.appendChild(el("li", { class: "ascii-layer" + (i === active ? " is-active" : "") + (l.visivel ? "" : " is-hidden"), "data-i": String(i) }, sel,
            lbtn("ascii-layer-eye" + (l.visivel ? "" : " is-off"), l.visivel ? "◉ visível" : "○ oculta", (l.visivel ? "Ocultar" : "Mostrar") + " a camada " + (i + 1), function () { commit(); l.visivel = !l.visivel; renderLayers(); update(); }),
            lbtn("ascii-layer-up", "↑", "Subir a camada " + (i + 1), function () { commit(); var t = layers[i]; layers[i] = layers[i + 1]; layers[i + 1] = t; if (active === i) active = i + 1; else if (active === i + 1) active = i; load(active); }, i === n - 1),
            lbtn("ascii-layer-down", "↓", "Descer a camada " + (i + 1), function () { commit(); var t = layers[i]; layers[i] = layers[i - 1]; layers[i - 1] = t; if (active === i) active = i - 1; else if (active === i - 1) active = i; load(active); }, i === 0),
            lbtn("ascii-layer-del", "✕", "Apagar a camada " + (i + 1), function () {
              commit();
              if (hasContent(layers[i]) && !confirm("Apagar a camada " + (i + 1) + " e o que tem nela?")) return;
              layers.splice(i, 1);
              if (active > i || active >= layers.length) active = Math.max(0, active - 1);
              load(active);
            }, n === 1)));
        })(i);
        layersBox.appendChild(list);
        var add = el("button", { type: "button", class: "ascii-btn secondary ascii-layer-add", id: K.prefix + "-camada-nova" }, "+ Nova camada (por cima)");
        if (n >= LAYERS_MAX) { add.disabled = true; add.textContent = "Máximo de " + LAYERS_MAX + " camadas"; }
        add.addEventListener("click", function () { if (layers.length >= LAYERS_MAX) return; commit(); layers.push({ raw: "", mk: [], visivel: true }); load(layers.length - 1); ta.focus(); });
        var row = el("div", { class: "ascii-actions ascii-layer-tools" }, add);
        layersBox.appendChild(row);
        if (n > 1) {
          var modes = el("fieldset", { class: "ascii-frames ascii-layer-view", id: K.prefix + "-camadas-ver" }, el("legend", null, "Ao editar, mostrar"));
          [["tudo", "tudo"], ["esmaecer", "outras esmaecidas"], ["so", "só a ativa"]].forEach(function (m) {
            var input = el("input", { type: "radio", name: K.prefix + "-ver", value: m[0], id: K.prefix + "-ver-" + m[0] });
            input.checked = viewMode === m[0];
            input.addEventListener("change", function () { if (input.checked) { viewMode = m[0]; update(); } });
            modes.appendChild(el("label", { class: "ascii-radio", for: K.prefix + "-ver-" + m[0] }, input, " " + m[1]));
          });
          layersBox.appendChild(modes);
        }
        ta.setAttribute("aria-label", K.title + " — camada " + (active + 1));
      }
      var curFrame = art ? art.moldura : "simples";
      function radio(value, label) {
        var input = el("input", { type: "radio", name: "ascii-moldura", value: value, id: "ascii-moldura-" + value });
        input.checked = curFrame === value;
        input.addEventListener("change", function () { if (input.checked) { curFrame = value; update(); } });
        return el("label", { class: "ascii-radio", for: "ascii-moldura-" + value }, input, " " + label);
      }
      var frames = K.frames ? el("fieldset", { class: "ascii-frames" }, el("legend", null, "Moldura"),
        radio("simples", "Moldura simples"), radio("nenhuma", "Sem moldura")) : null;
      var preview = el("div", { class: "ascii-preview", id: K.prefix + "-preview" });
      var save = el("button", { type: "button", class: "ascii-btn", id: K.prefix + "-salvar" }, "Salvar");
      var cancel = el("button", { type: "button", class: "ascii-btn secondary", id: K.prefix + "-cancelar" }, "Cancelar");
      var remove = existing ? el("button", { type: "button", class: "ascii-btn danger", id: K.prefix + "-remover" }, K.removeLabel) : null;
      var errBox = el("ul", { class: "ascii-erros", id: K.prefix + "-erros" });
      var hint = kind === "avatar"
        ? el("p", { class: "ascii-hint" }, "Um desenho pequeno, como uma foto de perfil: aparece aqui no topo e ao lado do seu nome em comentários e postagens. Até 8 linhas × 16 colunas; emojis não.")
        : el("p", { class: "ascii-hint" }, "Texto puro, fonte monoespaçada. Espaços são mantidos; tabulações viram 4 espaços. Caracteres de caixa como ", el("code", null, "┌─┐│└┘╔═╗"), " são permitidos; emojis não.");
      var previewWrap = kind === "avatar"
        ? el("div", { class: "avatar-preview-sizes" }, preview)
        : el("div", { class: "ascii-preview-phone" }, preview);
      var editor = el("div", { class: "ascii-editor" + (kind === "avatar" ? " avatar-editor" : ""), id: K.prefix + "-editor" },
        el("h2", { class: "ascii-editor-title" }, K.title),
        hint, layersBox, ta, typing, counter, errBox, colorsBox, frames,
        el("p", { class: "ascii-preview-label" }, kind === "avatar" ? "Pré-visualização (perfil e comentários)" : "Pré-visualização (largura de celular)"),
        previewWrap,
        el("div", { class: "ascii-actions" }, save, remove, cancel)
      );
      editorHost.appendChild(editor);
      var cur = null;
      function update(fromPaint) {
        if (!fromPaint) { cells = cellsFrom(rawChars, true); renderGrid(); }
        var n = layers.length;
        var LD = layers.map(function (l, i) {
          var lc = i === active ? cells : cellsFrom(Array.from(l.raw), true);
          var m = i === active ? mk : l.mk;
          return { text: lc.map(function (x) { return x.map(function (c) { return c.ch; }).join(""); }).join("\n"), mask: maskOf(lc, m), idx: i };
        });
        var errs = [];
        layers.forEach(function (l, i) {
          cleanAscii(i === active ? ta.value : l.raw, K.lines, K.cols, true).erros.forEach(function (e) { errs.push((n > 1 ? "Camada " + (i + 1) + ": " : "") + e); });
        });
        var comp = compositeC(LD.filter(function (d, i) { return layers[i].visivel; }));
        if (!comp.arte) errs.push(layers.some(function (l) { return !l.visivel && hasContent(l); }) ? "A arte está vazia: as camadas com desenho estão ocultas." : "A arte está vazia.");
        var cols = comp.lines.reduce(function (m, l) { return Math.max(m, cpLen(l)); }, 0);
        cur = { erros: errs, texto: comp.arte, mascara: comp.cores, linhas: comp.lines.length, colunas: cols, camadas: LD };
        counter.textContent = "Linhas: " + cur.linhas + "/" + K.lines + " · Colunas: " + Math.min(cols, 999) + "/" + K.cols +
          " · " + cpLen(comp.arte) + " caracteres" + (n > 1 ? " · editando a camada " + (active + 1) + " de " + n : "");
        counter.className = "ascii-counter" + (errs.length ? " erro" : "");
        while (errBox.firstChild) errBox.removeChild(errBox.firstChild);
        errs.forEach(function (e) { errBox.appendChild(el("li", null, e)); });
        while (preview.firstChild) preview.removeChild(preview.firstChild);
        var shownComp = viewMode === "so" && n > 1 ? compositeC([LD[active]]) : comp;
        var ok = shownComp.lines.length && !(WIDE_RE && WIDE_RE.test(shownComp.arte));
        var cut = function (c) { var ls = c.lines.slice(0, 40).map(function (l) { return Array.from(l).slice(0, 80).join(""); }); return { lines: ls, arte: ls.join("\n"), cores: c.cores ? c.cores.split("\n").slice(0, 40).map(function (x) { return x.slice(0, 80); }).join("\n") : null, origem: c.origem.split("\n").slice(0, 40).map(function (x) { return x.slice(0, 80); }).join("\n") }; };
        var sc = ok ? cut(shownComp) : null;
        var dim = viewMode === "esmaecer" && n > 1;
        if (!ok) {
          preview.appendChild(el("p", { class: "ascii-vazio" }, viewMode === "so" && n > 1 ? "A camada ativa está vazia." : "A pré-visualização aparece aqui."));
        } else if (kind === "avatar") {
          if (dim) preview.appendChild(el("div", { class: "avatar-preview-item avatar-preview-camadas" }, dimBlock(sc, active, "nenhuma", false), el("span", null, "camadas")));
          preview.appendChild(el("div", { class: "avatar-preview-item" }, avatarPreview(sc.arte, "lg", sc.cores), el("span", null, "perfil")));
          preview.appendChild(el("div", { class: "avatar-preview-item" },
            el("div", { class: "avatar-preview-comment" }, avatarPreview(sc.arte, "sm", sc.cores),
              el("div", null, el("p", { class: "bd-comment-meta" }, el("strong", null, ">>" + u.username), " · agora"), el("p", { class: "avatar-preview-body" }, "um comentário qualquer"))),
            el("span", null, "comentários")));
        } else if (dim) {
          preview.appendChild(dimBlock(sc, active, curFrame, true));
        } else {
          preview.appendChild(asciiBlock(sc.arte, curFrame, "Pré-visualização", sc.cores));
        }
        save.disabled = cur.erros.length > 0;
      }
      ta.addEventListener("input", function () {
        var nc = Array.from(ta.value);
        var caret = null;
        try { caret = Array.from(ta.value.slice(0, ta.selectionEnd)).length; } catch (e) { caret = null; }
        mk = shiftMask(rawChars, nc, mk, caret, brush);
        rawChars = nc;
        update();
      });
      renderLayers();
      update();
      ta.focus();
      cancel.addEventListener("click", function () { reload(""); });
      save.addEventListener("click", function () {
        update();
        if (cur.erros.length) return;
        save.disabled = true;
        setSt(status, "Salvando…");
        var camadas = cur.camadas.map(function (d, i) { return { arte: d.text, cores: d.mask, visivel: layers[i].visivel }; });
        var body = K.frames ? { camadas: camadas, moldura: curFrame } : { camadas: camadas };
        api("PUT", K.api + alvoQs, body).then(function (out) {
          if (out.res.ok) reload(K.savedMsg);
          else { save.disabled = false; setSt(status, (out.data && out.data.erro) || "Não foi possível salvar.", "erro"); }
        }).catch(function () { save.disabled = false; setSt(status, "Falha de rede.", "erro"); });
      });
      if (remove) remove.addEventListener("click", function () {
        if (!confirm(alvoQs ? "Remover " + (K.frames ? "a arte ASCII" : "o avatar") + " do perfil >>anônimo?" : K.confirmOwn)) return;
        remove.disabled = true;
        api("DELETE", K.api + alvoQs).then(function (out) {
          if (out.res.ok) reload(K.removedMsg);
          else { remove.disabled = false; setSt(status, (out.data && out.data.erro) || "Não foi possível remover.", "erro"); }
        }).catch(function () { remove.disabled = false; setSt(status, "Falha de rede.", "erro"); });
      });
    }
    section._openEditor = openEditor;
    return section;
  }

  function setSt(node, text, kind) {
    node.textContent = text || "";
    node.className = "ascii-status" + (kind ? " " + kind : "");
  }

  function render(root, data, reload, flash) {
    while (root.firstChild) root.removeChild(root.firstChild);
    var u = data.usuario;
    if (!u) {
      root.appendChild(el("p", { class: "profile-status erro" }, "Usuário não encontrado."));
      return;
    }
    var name = el("h1", { class: "profile-name" });
    if (window.BDAccount) {
      name.appendChild(window.BDAccount.userLink(u));
    } else {
      name.appendChild(document.createTextNode(">>" + u.username));
    }
    var headText = el("div", { class: "profile-head-text" }, name);
    var headAvatar = u.avatar && window.BDAccount.avatarNode ? window.BDAccount.avatarNode(u, "lg") : null;
    if (headAvatar) headAvatar.setAttribute("id", "perfil-avatar");
    root.appendChild(el("div", { class: "profile-head" + (headAvatar ? " has-avatar" : "") }, headAvatar, headText));
    if (data.reservado) {
      headText.appendChild(el("p", { class: "profile-meta" }, data.mensagem || "Conta reservada."));
      return;
    }
    if (data.anonimo) {
      renderAnon(root, headText, data, reload, flash);
      return;
    }
    var meta = "No basedisso desde " + relativeTime(u.created_at);
    if (u.is_admin) meta += " · administrador";
    else if (data.adm_de && data.adm_de.length) meta += " · ADM de " + data.adm_de.map(function (s) { return "b/" + s; }).join(", ");
    if (u.is_primordial) meta += u.primordial_n != null ? " · primordial #" + u.primordial_n : " · primordial";
    headText.appendChild(el("p", { class: "profile-meta" }, meta));
    var asciiSec = renderAsciiSection(root, data, reload, flash);
    if (asciiSec) {
      root.appendChild(asciiSec);
      if (flash) setSt(asciiSec.querySelector(".ascii-status"), flash, "ok");
      if (!autoOpened && /^#editar-(ascii|avatar)$/.test(location.hash) && asciiSec._openEditor && data.pode_editar_ascii) { autoOpened = true; asciiSec._openEditor(location.hash === "#editar-avatar" ? "avatar" : "arte"); }
    }
    var comments = data.comentarios || [];
    root.appendChild(el("h2", { class: "bd-comments-title" }, comments.length ? "Comentários" : "Ainda sem comentários."));
    if (!comments.length) return;
    var list = el("ul", { class: "profile-comments" });
    comments.forEach(function (c) {
      var body = el("p", { class: "profile-comment-body" });
      window.BDAccount.appendBodyWithMentions(body, c.body || "", c.mencoes || {});
      var del = null;
      if (data.pode_editar_ascii && c.id) {
        del = el("button", { type: "button", class: "bd-comment-del-btn profile-comment-del", "data-excluir-comentario": c.id }, "excluir");
        del.addEventListener("click", function () {
          if (!confirm("Excluir este comentário? Isso não pode ser desfeito.")) return;
          del.disabled = true;
          api("DELETE", "/api/comments/" + encodeURIComponent(c.id)).then(function (out) {
            if (out.res.ok) reload("");
            else { del.disabled = false; alert((out.data && out.data.erro) || "Não foi possível excluir."); }
          }).catch(function () { del.disabled = false; alert("Falha de rede."); });
        });
      }
      list.appendChild(
        el(
          "li",
          { "data-comment-id": c.id },
          el("p", { class: "profile-comment-page" }, pageLink(c.page), " · ", c.created_at ? new Date(c.created_at).toLocaleString("pt-BR") : ""),
          body,
          (function () { var box = el("div"); window.BDAccount.img && window.BDAccount.img.append(box, c.body || ""); return box.firstChild || null; })(),
          del
        )
      );
    });
    root.appendChild(list);
  }

  // Perfil coletivo >>anônimo: postagens e comentários publicados como >>anônimo, 30 por página.
  function renderAnon(root, headText, data, reload, flash) {
    headText.appendChild(el("p", { class: "profile-meta" }, "Perfil coletivo: tudo o que foi publicado como >>anônimo (por quem marcou a caixinha ou postou sem conta e sem nome)."));
    if (data.pode_editar_ascii) headText.appendChild(el("p", { class: "profile-meta profile-anon-adm" }, "Você é ADM do site: pode editar a arte e o avatar deste perfil coletivo."));
    if (data.ultima_edicao) {
      var ue = data.ultima_edicao;
      var line = el("p", { class: "profile-meta profile-anon-log", id: "perfil-anon-log" }, "Última edição (visível só para ADMs): ");
      line.appendChild(ue.por && window.BDAccount ? window.BDAccount.userLink(ue.por) : document.createTextNode("[conta removida]"));
      line.appendChild(document.createTextNode((ue.o_que ? " · " + ue.o_que : "") + " · " + (ue.em ? new Date(ue.em).toLocaleString("pt-BR") : "")));
      headText.appendChild(line);
    }
    var asciiSec = renderAsciiSection(root, data, reload, flash);
    if (asciiSec) {
      root.appendChild(asciiSec);
      if (flash) setSt(asciiSec.querySelector(".ascii-status"), flash, "ok");
    }
    var items = data.contribuicoes || [];
    var pagina = data.pagina || 1;
    root.appendChild(el("h2", { class: "bd-comments-title" }, items.length ? "Contribuições" + (pagina > 1 ? " — página " + pagina : "") : (pagina > 1 ? "Nada nesta página." : "Ainda sem contribuições.")));
    if (items.length) {
      var list = el("ul", { class: "profile-comments profile-anon-list" });
      items.forEach(function (c) {
        var meta = el("p", { class: "profile-comment-page" });
        if (c.tipo === "postagem") {
          meta.appendChild(el("span", { class: "profile-anon-kind" }, "postagem em "));
          meta.appendChild(el("a", { href: "/b/" + c.community + "/" }, "b/" + c.community));
        } else {
          meta.appendChild(el("span", { class: "profile-anon-kind" }, "comentário em "));
          meta.appendChild(pageLink(c.page));
        }
        meta.appendChild(document.createTextNode(" · " + (c.created_at ? new Date(c.created_at).toLocaleString("pt-BR") : "")));
        if (c.usuario && c.usuario.is_admin && window.BDAccount) {
          meta.appendChild(document.createTextNode(" "));
          meta.appendChild(el("span", { class: "user-badge", title: "administrador" }, "[M]"));
        } else if (c.usuario && c.usuario.b_admin) {
          meta.appendChild(document.createTextNode(" "));
          meta.appendChild(el("span", { class: "user-badge user-badge-b", title: "ADM de b/" + c.usuario.b_admin }, "[b]"));
        }
        if (window.BDAccount && window.BDAccount.appendAnonExtras) window.BDAccount.appendAnonExtras(meta, Object.assign({ anonimo: true }, c));
        var title = c.tipo === "postagem" ? el("p", { class: "profile-anon-title" }, el("a", { href: c.page }, c.title || "(sem título)")) : null;
        var body = null;
        if (c.body) {
          body = el("p", { class: "profile-comment-body" });
          window.BDAccount.appendBodyWithMentions(body, c.body, c.mencoes || {});
        }
        list.appendChild(el("li", { "data-anon-id": c.id, "data-anon-tipo": c.tipo }, meta, title, body,
          (function () { var box = el("div"); window.BDAccount.img && window.BDAccount.img.append(box, c.body || ""); return box.firstChild || null; })()));
      });
      root.appendChild(list);
    }
    if (pagina > 1 || data.mais) {
      var nav = el("p", { class: "profile-anon-pager" });
      if (pagina > 1) nav.appendChild(el("a", { href: "/@anônimo" + (pagina > 2 ? "?pagina=" + (pagina - 1) : ""), rel: "prev" }, "← mais recentes"));
      if (pagina > 1 && data.mais) nav.appendChild(document.createTextNode(" · "));
      if (data.mais) nav.appendChild(el("a", { href: "/@anônimo?pagina=" + (pagina + 1), rel: "next" }, "mais antigas →"));
      root.appendChild(nav);
    }
  }

  function init() {
    var root = document.getElementById("profile-root");
    if (!root) return;
    var path = root.getAttribute("data-path") || location.pathname;
    var m = path.match(/^\/@([^/]+)\/?$/);
    if (!m) {
      root.textContent = "Perfil inválido.";
      return;
    }
    var name = decodeURIComponent(m[1]);
    function load(flash) {
    var pg = (location.search.match(/[?&]pagina=(\d+)/) || [])[1];
    fetch("/api/users/" + encodeURIComponent(name) + (pg ? "?pagina=" + pg : ""), { headers: { Accept: "application/json" }, credentials: "same-origin" })
      .then(function (res) {
        return res.json().then(function (data) { return { res: res, data: data }; });
      })
      .then(function (out) {
        if (out.res.status === 404) {
          while (root.firstChild) root.removeChild(root.firstChild);
          root.appendChild(el("p", { class: "profile-status erro" }, out.data && out.data.erro ? out.data.erro : "Usuário não encontrado."));
          return;
        }
        if (!out.res.ok) {
          while (root.firstChild) root.removeChild(root.firstChild);
          root.appendChild(el("p", { class: "profile-status erro" }, "Não foi possível carregar o perfil."));
          return;
        }
        render(root, out.data, load, flash);
        if (out.data.usuario && out.data.usuario.username) {
          document.title = ">>" + out.data.usuario.username + " — basedisso";
        }
      })
      .catch(function () {
        while (root.firstChild) root.removeChild(root.firstChild);
        root.appendChild(el("p", { class: "profile-status erro" }, "Falha de rede ao carregar o perfil."));
      });
    }
    load("");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
