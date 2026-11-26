// Editor de arte ASCII com camadas, cores e pincel. Usado no perfil (/perfil.js) e na ferramenta /f/arte.html.
// As regras de limpeza e de composição são as mesmas de functions/_lib/ascii.js (o servidor sempre revalida).
(function () {
  "use strict";
  function el() { return window.BDAccount.el.apply(null, arguments); }

  // ---------- Arte ASCII (mesmas regras de functions/_lib/ascii.js) ----------
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

  // ---------- Editor de arte com camadas (perfil e ferramenta /f/arte.html) ----------
  // o: { prefix, title, lines, cols, rows, kind: 'arte'|'avatar'|'livre', layers: [{arte, cores, visivel}],
  //      hint (nó), extras (nós depois das cores), previewLabel, previewWrapClass, previewHost (nó; senão fica no editor),
  //      renderPreview(preview, sc, info), onChange(api), tools (desfazer, preencher, caracteres), minFont, maxFont, minCols }
  var CHARS = ["─", "│", "┌", "┐", "└", "┘", "├", "┤", "┬", "┴", "┼", "═", "║", "╔", "╗", "╚", "╝", "╠", "╣", "╦", "╩", "╬",
    "█", "▓", "▒", "░", "▀", "▄", "▌", "▐", "■", "□", "▪", "▫", "●", "○", "◆", "◇", "▲", "▼", "◀", "▶",
    "·", "•", "°", "×", "÷", "±", "→", "←", "↑", "↓", "~", "^", "*", "#", "@", "%", "&", "+", "=", "-", "_", "/", "\\", "|", "<", ">", "(", ")", "[", "]", "{", "}", ".", ",", ":", ";", "'", "\"", "`"];
  function create(o) {
    var P = o.prefix, ML = o.lines, MC = o.cols, kind = o.kind || "arte";
    var ta = el("textarea", { id: P + "-input", class: "ascii-input" + (kind === "avatar" ? " avatar-input" : "") + (kind === "livre" ? " livre-input" : ""), rows: o.rows || "12", wrap: "off", spellcheck: "false",
      autocapitalize: "off", autocomplete: "off", "aria-label": o.title, maxlength: String(o.rawMax || 4000),
      placeholder: o.placeholder || ("Desenhe com texto. Até " + ML + " linhas × " + MC + " colunas.") });
    var layers = [];
    var active = 0, viewMode = "tudo", rawChars = [], mk = [], brush = ".";
    function toInner(list) {
      var src = list && list.length ? list : [{ arte: "", cores: null, visivel: true }];
      return src.slice(0, LAYERS_MAX).map(function (l) { return { raw: String(l.arte || ""), mk: l.cores ? maskToRaw(l.arte, l.cores) : Array.from(String(l.arte || "")).map(function () { return "."; }), visivel: l.visivel !== false }; });
    }
    layers = toInner(o.layers);
    active = layers.length - 1;
    ta.value = layers[active].raw; rawChars = Array.from(ta.value); mk = layers[active].mk.slice();
    var NOMES = { ".": "padrão" };
    window.BDAccount.asciiCores.forEach(function (c) { NOMES[c.c] = c.nome; });
    var typingDot = el("span", { class: "ascii-typing-dot", "aria-hidden": "true" }, "█");
    var typingName = el("strong", { class: "ascii-typing-name" });
    var typing = el("p", { class: "ascii-typing", id: P + "-digitando", "aria-live": "polite" }, typingDot, " Digitando em: ", typingName,
      el("span", { class: "ascii-typing-hint" }, " — o texto novo sai nessa cor (espaços nunca têm cor)"));
    var palette = el("div", { class: "ascii-palette", role: "radiogroup", "aria-label": "Pincel de cor", id: P + "-paleta" });
    var swatches = [];
    function swatch(code, label, cls) {
      var b = el("button", { type: "button", class: "ascii-swatch" + (cls ? " " + cls : ""), role: "radio", "data-cor": code, title: label, "aria-label": label },
        el("span", { class: "ascii-swatch-dot" + (code === "." ? "" : " ac-" + code), "aria-hidden": "true" }, code === "." ? "⌫" : "█"), el("span", { class: "ascii-swatch-name" }, label));
      b.addEventListener("mousedown", function (ev) { ev.preventDefault(); }); // não tira o foco/seleção do textarea
      b.addEventListener("click", function () { brush = code; syncBrush(); changed(); });
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
    var clearColors = el("button", { type: "button", class: "ascii-btn secondary ascii-limpar", id: P + "-limpar-cores" }, "Limpar cores");
    var grid = el("div", { class: "ascii-paint", id: P + "-pintura", "aria-label": "Toque ou arraste sobre os caracteres para pintar" });
    var colorsBox = el("div", { class: "ascii-cores" },
      el("p", { class: "ascii-preview-label" }, "Cores — escolha uma cor para digitar nela, ou toque/arraste sobre os caracteres para pintar:"),
      palette, el("div", { class: "ascii-paint-scroll" }, grid), el("div", { class: "ascii-actions" }, clearColors));
    var gridWrap = grid.parentNode;
    var cells = [];
    var painting = false, pending = false;
    var maxFont = o.maxFont || (kind === "avatar" ? 26 : 20), minFont = o.minFont || 10, minCols = o.minCols || (kind === "avatar" ? 16 : 24);
    function renderGrid() {
      while (grid.firstChild) grid.removeChild(grid.firstChild);
      var maxw = 1;
      cells.slice(0, ML + 8).forEach(function (line) {
        var row = el("div", { class: "ascii-paint-row" });
        line.slice(0, MC + 16).forEach(function (c) {
          var sp = /\s/.test(c.ch);
          var code = sp ? "." : mk[c.raw] || ".";
          row.appendChild(el("span", { class: "ascii-cell" + (sp ? " is-space" : "") + (code !== "." ? " ac-" + code : ""), "data-raw": String(c.raw) }, sp ? " " : c.ch));
        });
        if (!line.length) row.appendChild(document.createTextNode(" "));
        maxw = Math.max(maxw, Math.min(line.length, MC + 16));
        grid.appendChild(row);
      });
      grid.style.setProperty("--cols", String(maxw));
      var avail = (grid.parentNode && grid.parentNode.clientWidth) || 320;
      var fs = Math.max(minFont, Math.min(maxFont, Math.floor((avail - 12) / (Math.max(maxw, minCols) * 0.62))));
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
      if (!pending) { pending = true; requestAnimationFrame(function () { pending = false; update(true); recordSoon(); }); }
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
    clearColors.addEventListener("click", function () { mk = rawChars.map(function () { return "."; }); update(); record(); });
    var counter = el("p", { class: "ascii-counter", id: P + "-counter", "aria-live": "polite" });
    var errBox = el("ul", { class: "ascii-erros", id: P + "-erros" });
    var layersBox = el("div", { class: "ascii-camadas", id: P + "-camadas" });
    function commit() { layers[active].raw = ta.value; layers[active].mk = mk.slice(); }
    function load(i) { active = i; ta.value = layers[i].raw; rawChars = Array.from(ta.value); mk = layers[i].mk.slice(); renderLayers(); update(); }
    function hasContent(l) { return /\S/.test(l.raw); }
    function lbtn(cls, label, title, onClick, disabled) {
      var b = el("button", { type: "button", class: "ascii-layer-btn " + cls, title: title, "aria-label": title }, label);
      if (disabled) b.disabled = true;
      b.addEventListener("mousedown", function (ev) { ev.preventDefault(); });
      b.addEventListener("click", function (ev) { onClick(ev); record(); });
      return b;
    }
    function renderLayers() {
      while (layersBox.firstChild) layersBox.removeChild(layersBox.firstChild);
      var n = layers.length;
      layersBox.appendChild(el("p", { class: "ascii-preview-label" }, "Camadas (até " + LAYERS_MAX + ") — a de cima cobre a de baixo; espaços são transparentes. O texto, as cores e o pincel valem para a camada ativa."));
      var list = el("ul", { class: "ascii-layer-list", id: P + "-camadas-lista" });
      for (var i = n - 1; i >= 0; i--) (function (i) {
        var l = layers[i];
        var name = "Camada " + (i + 1) + (n > 1 && i === 0 ? " (base)" : "") + (n > 1 && i === n - 1 ? " (topo)" : "");
        var sel = el("button", { type: "button", class: "ascii-layer-sel", "aria-pressed": i === active ? "true" : "false", "data-i": String(i) }, name, hasContent(l) ? null : el("span", { class: "ascii-layer-empty" }, " · vazia"));
        sel.addEventListener("click", function () { if (i === active) return; commit(); load(i); changed(); });
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
      var add = el("button", { type: "button", class: "ascii-btn secondary ascii-layer-add", id: P + "-camada-nova" }, "+ Nova camada (por cima)");
      if (n >= LAYERS_MAX) { add.disabled = true; add.textContent = "Máximo de " + LAYERS_MAX + " camadas"; }
      add.addEventListener("click", function () { if (layers.length >= LAYERS_MAX) return; commit(); layers.push({ raw: "", mk: [], visivel: true }); load(layers.length - 1); record(); ta.focus(); });
      layersBox.appendChild(el("div", { class: "ascii-actions ascii-layer-tools" }, add));
      if (n > 1) {
        var modes = el("fieldset", { class: "ascii-frames ascii-layer-view", id: P + "-camadas-ver" }, el("legend", null, "Ao editar, mostrar"));
        [["tudo", "tudo"], ["esmaecer", "outras esmaecidas"], ["so", "só a ativa"]].forEach(function (m) {
          var input = el("input", { type: "radio", name: P + "-ver", value: m[0], id: P + "-ver-" + m[0] });
          input.checked = viewMode === m[0];
          input.addEventListener("change", function () { if (input.checked) { viewMode = m[0]; update(); changed(); } });
          modes.appendChild(el("label", { class: "ascii-radio", for: P + "-ver-" + m[0] }, input, " " + m[1]));
        });
        layersBox.appendChild(modes);
      }
      ta.setAttribute("aria-label", o.title + " — camada " + (active + 1));
    }
    // ---- Ferramentas (desfazer/refazer, limpar/preencher camada, caracteres) ----
    var hist = [], hidx = -1, htimer = null;
    function snapshot() { commit(); return JSON.stringify({ l: layers.map(function (l) { return [l.raw, l.mk.join(""), l.visivel]; }), a: active, v: viewMode }); }
    function restore(json) {
      var d; try { d = JSON.parse(json); } catch (e) { return false; }
      if (!d || !Array.isArray(d.l) || !d.l.length) return false;
      layers = d.l.slice(0, LAYERS_MAX).map(function (x) { var raw = String(x[0] || ""); var m = String(x[1] || "").split(""); var n = Array.from(raw).length; while (m.length < n) m.push("."); return { raw: raw, mk: m.slice(0, n), visivel: x[2] !== false }; });
      viewMode = d.v === "esmaecer" || d.v === "so" ? d.v : "tudo";
      load(Math.min(Math.max(0, d.a | 0), layers.length - 1));
      return true;
    }
    function record() {
      if (!o.tools) { changed(); return; }
      if (htimer) { clearTimeout(htimer); htimer = null; }
      var s = snapshot();
      if (s !== hist[hidx]) { hist = hist.slice(0, hidx + 1); hist.push(s); if (hist.length > 100) hist.shift(); hidx = hist.length - 1; }
      syncUndo(); changed();
    }
    function recordSoon() { if (!o.tools) { changed(); return; } if (htimer) clearTimeout(htimer); htimer = setTimeout(record, 400); }
    var undoB = null, redoB = null, toolsBar = null, picker = null, fillIn = null;
    function syncUndo() { if (undoB) { undoB.disabled = hidx <= 0; redoB.disabled = hidx >= hist.length - 1; } }
    function undo() { if (htimer) record(); if (hidx > 0) { hidx--; restore(hist[hidx]); syncUndo(); changed(); } }
    function redo() { if (htimer) record(); if (hidx < hist.length - 1) { hidx++; restore(hist[hidx]); syncUndo(); changed(); } }
    function setText(text, maskStr) { ta.value = text; rawChars = Array.from(text); mk = maskToRaw(text, maskStr); update(); record(); }
    if (o.tools) {
      undoB = el("button", { type: "button", class: "ascii-btn secondary", id: P + "-desfazer", title: "Desfazer (Ctrl+Z)" }, "↶ Desfazer");
      redoB = el("button", { type: "button", class: "ascii-btn secondary", id: P + "-refazer", title: "Refazer (Ctrl+Shift+Z)" }, "↷ Refazer");
      var clearL = el("button", { type: "button", class: "ascii-btn secondary", id: P + "-limpar-camada" }, "Limpar camada");
      fillIn = el("input", { type: "text", class: "ascii-fill-char", id: P + "-preencher-char", maxlength: "2", value: ".", "aria-label": "Caractere para preencher", size: "2" });
      var fillB = el("button", { type: "button", class: "ascii-btn secondary", id: P + "-preencher" }, "Preencher vazios com");
      [undoB, redoB, clearL, fillB].forEach(function (b) { b.addEventListener("mousedown", function (ev) { ev.preventDefault(); }); });
      undoB.addEventListener("click", undo); redoB.addEventListener("click", redo);
      clearL.addEventListener("click", function () { if (hasContent({ raw: ta.value }) && !confirm("Limpar tudo da camada " + (active + 1) + "?")) return; setText("", null); });
      fillB.addEventListener("click", function () {
        var ch = Array.from(fillIn.value || "")[0] || ".";
        if (/\s/.test(ch) || STRIP1.test(ch) || (WIDE_RE && WIDE_RE.test(ch))) { fillIn.value = "."; ch = "."; }
        commit();
        var H = 0, Wd = 0;
        layers.forEach(function (l) { var lc = cellsFrom(Array.from(l.raw), true); if (lc.length > H) H = lc.length; lc.forEach(function (x) { if (x.length > Wd) Wd = x.length; }); });
        if (!H || !Wd) { H = Math.min(ML, 8); Wd = Math.min(MC, 24); }
        var lc = cellsFrom(rawChars, true), txt = [], msk = [];
        for (var r = 0; r < H; r++) {
          var line = lc[r] || [], t = "", m = "";
          for (var c = 0; c < Wd; c++) {
            var cell = line[c];
            if (cell && !/\s/.test(cell.ch)) { t += cell.ch; m += mk[cell.raw] || "."; } else { t += ch; m += brush; }
          }
          txt.push(t); msk.push(m);
        }
        setText(txt.join("\n"), msk.join("\n"));
      });
      toolsBar = el("div", { class: "ascii-actions ascii-tools-bar", id: P + "-ferramentas" }, undoB, redoB, clearL, el("span", { class: "ascii-fill" }, fillB, fillIn));
      picker = el("div", { class: "ascii-chars", id: P + "-caracteres", role: "group", "aria-label": "Caracteres" });
      CHARS.forEach(function (ch) {
        var b = el("button", { type: "button", class: "ascii-char", "data-ch": ch, title: "Inserir " + ch }, ch);
        b.addEventListener("mousedown", function (ev) { ev.preventDefault(); });
        b.addEventListener("click", function () {
          var s0 = ta.selectionStart == null ? ta.value.length : ta.selectionStart, e0 = ta.selectionEnd == null ? s0 : ta.selectionEnd;
          ta.value = ta.value.slice(0, s0) + ch + ta.value.slice(e0);
          try { ta.setSelectionRange(s0 + ch.length, s0 + ch.length); } catch (e) {}
          ta.focus();
          ta.dispatchEvent(new Event("input", { bubbles: true }));
        });
        picker.appendChild(b);
      });
      ta.addEventListener("keydown", function (ev) {
        var k = (ev.key || "").toLowerCase();
        if (!(ev.ctrlKey || ev.metaKey)) return;
        if (k === "z" && !ev.shiftKey) { ev.preventDefault(); undo(); }
        else if ((k === "z" && ev.shiftKey) || k === "y") { ev.preventDefault(); redo(); }
      });
    }
    var preview = el("div", { class: "ascii-preview", id: P + "-preview" });
    var previewWrap = el("div", { class: o.previewWrapClass || "ascii-preview-phone" }, preview);
    var parts = [el("h2", { class: "ascii-editor-title" }, o.title), o.hint || null, layersBox, toolsBar, ta, picker, typing, counter, errBox, colorsBox].concat(o.extras || []);
    if (!o.previewHost) parts.push(el("p", { class: "ascii-preview-label" }, o.previewLabel || "Pré-visualização"), previewWrap);
    else { o.previewHost.appendChild(el("p", { class: "ascii-preview-label" }, o.previewLabel || "Pré-visualização")); o.previewHost.appendChild(previewWrap); }
    var node = el("div", { class: "ascii-editor" + (kind === "avatar" ? " avatar-editor" : "") + (kind === "livre" ? " livre-editor" : ""), id: P + "-editor" });
    parts.forEach(function (p) { if (p) node.appendChild(p); });
    var cur = null;
    function layerData() {
      return layers.map(function (l, i) {
        var lc = i === active ? cells : cellsFrom(Array.from(l.raw), true);
        var m = i === active ? mk : l.mk;
        return { text: lc.map(function (x) { return x.map(function (c) { return c.ch; }).join(""); }).join("\n"), mask: maskOf(lc, m), idx: i, linhas: lc.length, colunas: lc.reduce(function (a, x) { return Math.max(a, x.length); }, 0) };
      });
    }
    function update(fromPaint) {
      if (!fromPaint) { cells = cellsFrom(rawChars, true); renderGrid(); }
      var n = layers.length;
      var LD = layerData();
      var errs = [];
      layers.forEach(function (l, i) {
        cleanAscii(i === active ? ta.value : l.raw, ML, MC, true).erros.forEach(function (e) { errs.push((n > 1 ? "Camada " + (i + 1) + ": " : "") + e); });
      });
      var comp = compositeC(LD.filter(function (d, i) { return layers[i].visivel; }));
      if (!comp.arte) errs.push(layers.some(function (l) { return !l.visivel && hasContent(l); }) ? "A arte está vazia: as camadas com desenho estão ocultas." : "A arte está vazia.");
      var cols = comp.lines.reduce(function (m, l) { return Math.max(m, cpLen(l)); }, 0);
      cur = { erros: errs, texto: comp.arte, mascara: comp.cores, linhas: comp.lines.length, colunas: cols, camadas: LD, comp: comp };
      counter.textContent = "Linhas: " + cur.linhas + "/" + ML + " · Colunas: " + Math.min(cols, 999) + "/" + MC +
        " · " + cpLen(comp.arte) + " caracteres" + (n > 1 ? " · editando a camada " + (active + 1) + " de " + n : "");
      counter.className = "ascii-counter" + (errs.length ? " erro" : "");
      while (errBox.firstChild) errBox.removeChild(errBox.firstChild);
      errs.forEach(function (e) { errBox.appendChild(el("li", null, e)); });
      while (preview.firstChild) preview.removeChild(preview.firstChild);
      var shownComp = viewMode === "so" && n > 1 ? compositeC([LD[active]]) : comp;
      var ok = shownComp.lines.length && !(WIDE_RE && WIDE_RE.test(shownComp.arte));
      var PL = Math.max(40, ML), PC = Math.max(80, MC);
      var cut = function (c) { var ls = c.lines.slice(0, PL).map(function (l) { return Array.from(l).slice(0, PC).join(""); }); return { lines: ls, arte: ls.join("\n"), cores: c.cores ? c.cores.split("\n").slice(0, PL).map(function (x) { return x.slice(0, PC); }).join("\n") : null, origem: c.origem.split("\n").slice(0, PL).map(function (x) { return x.slice(0, PC); }).join("\n") }; };
      if (!ok) preview.appendChild(el("p", { class: "ascii-vazio" }, viewMode === "so" && n > 1 ? "A camada ativa está vazia." : "A pré-visualização aparece aqui."));
      else o.renderPreview(preview, cut(shownComp), { dim: viewMode === "esmaecer" && n > 1, active: active, n: n });
      if (o.onUpdate) o.onUpdate(api);
    }
    function changed() { if (o.onChange) o.onChange(api); }
    ta.addEventListener("input", function () {
      var nc = Array.from(ta.value);
      var caret = null;
      try { caret = Array.from(ta.value.slice(0, ta.selectionEnd)).length; } catch (e) { caret = null; }
      mk = shiftMask(rawChars, nc, mk, caret, brush);
      rawChars = nc;
      update();
      recordSoon();
    });
    var api = {
      node: node, ta: ta, preview: preview,
      update: function () { update(); },
      state: function () { return cur; },
      // Camadas como o servidor recebe: [{ arte, cores, visivel }] (posições preservadas).
      layersData: function () { return cur.camadas.map(function (d, i) { return { arte: d.text, cores: d.mask, visivel: layers[i].visivel }; }); },
      setLayers: function (list) { layers = toInner(list); viewMode = "tudo"; load(layers.length - 1); record(); },
      snapshot: snapshot,
      restore: function (json) { var ok = restore(json); if (ok) { hist = []; hidx = -1; record(); } return ok; },
      focus: function () { ta.focus(); },
      active: function () { return active; },
    };
    renderLayers();
    update();
    if (o.tools) { hist = [snapshot()]; hidx = 0; syncUndo(); }
    return api;
  }

  window.BDAsciiEditor = {
    create: create,
    LAYERS_MAX: LAYERS_MAX,
    CHARS: CHARS,
    util: {
      ASCII_LINES: ASCII_LINES, ASCII_COLS: ASCII_COLS, AVATAR_LINES: AVATAR_LINES, AVATAR_COLS: AVATAR_COLS,
      WIDE_RE: WIDE_RE, cpLen: cpLen, cleanAscii: cleanAscii, framedText: framedText, framedMask: framedMask, asciiBlock: asciiBlock,
      cellsFrom: cellsFrom, maskOf: maskOf, shiftMask: shiftMask, maskToRaw: maskToRaw, compositeC: compositeC, dimBlock: dimBlock,
    },
  };
})();
