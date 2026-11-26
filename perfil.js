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

  function cleanAscii(raw, maxLines, maxCols) {
    var ML = maxLines || ASCII_LINES, MC = maxCols || ASCII_COLS;
    var s = String(raw == null ? "" : raw).replace(/\r\n?/g, "\n").replace(/\t/g, "    ");
    try { s = s.normalize("NFC"); } catch (e) {}
    s = s.replace(STRIP_RE, "");
    if (MARK_RE) s = s.replace(MARK_RE, "");
    var lines = s.split("\n").map(function (l) { return l.replace(/\s+$/, ""); });
    while (lines.length && lines[lines.length - 1] === "") lines.pop();
    while (lines.length && lines[0] === "") lines.shift();
    var cols = 0, longest = 0, errs = [];
    lines.forEach(function (l, i) {
      var n = cpLen(l);
      if (n > cols) { cols = n; longest = i + 1; }
    });
    if (WIDE_RE && WIDE_RE.test(s)) errs.push("Emojis e caracteres largos não são aceitos (quebram o alinhamento).");
    if (!lines.length) errs.push("A arte está vazia.");
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
  function cellsFrom(rawChars) {
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
    while (lines.length && !lines[0].length) lines.shift();
    return lines;
  }
  function maskOf(cells, mk) {
    var any = false;
    var s = cells.map(function (l) {
      return l.map(function (c) { var v = /\s/.test(c.ch) ? "." : mk[c.raw] || "."; if (v !== ".") any = true; return v; }).join("");
    }).join("\n");
    return any ? s : null;
  }
  function shiftMask(oldChars, newChars, mk) {
    var p = 0, a = oldChars.length, b = newChars.length;
    while (p < a && p < b && oldChars[p] === newChars[p]) p++;
    var s = 0;
    while (s < a - p && s < b - p && oldChars[a - 1 - s] === newChars[b - 1 - s]) s++;
    var mid = [];
    for (var i = 0; i < b - p - s; i++) mid.push(".");
    return mk.slice(0, p).concat(mid, mk.slice(a - s));
  }
  function maskToRaw(arte, cores) {
    var mk = [], al = String(arte || "").split("\n"), ml = String(cores || "").split("\n");
    al.forEach(function (l, i) { if (i) mk.push("."); var n = cpLen(l), m = ml[i] || ""; for (var j = 0; j < n; j++) mk.push(/^[1-8]$/.test(m.charAt(j)) ? m.charAt(j) : "."); });
    return mk;
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
      ta.value = existing ? existing.arte : "";
      var rawChars = Array.from(ta.value);
      var mk = existing && existing.cores ? maskToRaw(existing.arte, existing.cores) : rawChars.map(function () { return "."; });
      var brush = "1";
      var palette = el("div", { class: "ascii-palette", role: "radiogroup", "aria-label": "Pincel de cor", id: K.prefix + "-paleta" });
      var swatches = [];
      function swatch(code, label, cls) {
        var b = el("button", { type: "button", class: "ascii-swatch" + (cls ? " " + cls : ""), role: "radio", "data-cor": code, title: label, "aria-label": label },
          el("span", { class: "ascii-swatch-dot" + (code === "." ? "" : " ac-" + code), "aria-hidden": "true" }, code === "." ? "⌫" : "█"), el("span", { class: "ascii-swatch-name" }, label));
        b.addEventListener("click", function () { brush = code; syncBrush(); });
        swatches.push(b); palette.appendChild(b);
      }
      window.BDAccount.asciiCores.forEach(function (c) { swatch(c.c, c.nome); });
      swatch(".", "borracha", "is-eraser");
      function syncBrush() { swatches.forEach(function (b) { var on = b.getAttribute("data-cor") === brush; b.setAttribute("aria-checked", on ? "true" : "false"); b.classList.toggle("is-on", on); }); }
      syncBrush();
      var clearColors = el("button", { type: "button", class: "ascii-btn secondary ascii-limpar", id: K.prefix + "-limpar-cores" }, "Limpar cores");
      var grid = el("div", { class: "ascii-paint", id: K.prefix + "-pintura", "aria-label": "Toque ou arraste sobre os caracteres para pintar" });
      var colorsBox = el("div", { class: "ascii-cores" },
        el("p", { class: "ascii-preview-label" }, "Cores — escolha o pincel e toque ou arraste sobre os caracteres:"),
        palette, el("div", { class: "ascii-paint-scroll" }, grid), el("div", { class: "ascii-actions" }, clearColors));
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
        colorsBox.hidden = !cells.length;
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
      clearColors.addEventListener("click", function () { mk = rawChars.map(function () { return "."; }); update(); });
      var counter = el("p", { class: "ascii-counter", id: K.prefix + "-counter", "aria-live": "polite" });
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
        hint, ta, counter, errBox, colorsBox, frames,
        el("p", { class: "ascii-preview-label" }, kind === "avatar" ? "Pré-visualização (perfil e comentários)" : "Pré-visualização (largura de celular)"),
        previewWrap,
        el("div", { class: "ascii-actions" }, save, remove, cancel)
      );
      editorHost.appendChild(editor);
      var cur = null;
      function update(fromPaint) {
        if (!fromPaint) { cells = cellsFrom(rawChars); renderGrid(); }
        var mask = maskOf(cells, mk);
        cur = cleanAscii(ta.value, K.lines, K.cols);
        counter.textContent = "Linhas: " + cur.linhas + "/" + K.lines + " · Colunas: " + Math.min(cur.colunas, 999) + "/" + K.cols +
          " · " + cpLen(cur.arte) + " caracteres";
        counter.className = "ascii-counter" + (cur.erros.length ? " erro" : "");
        while (errBox.firstChild) errBox.removeChild(errBox.firstChild);
        cur.erros.forEach(function (e) { errBox.appendChild(el("li", null, e)); });
        while (preview.firstChild) preview.removeChild(preview.firstChild);
        var ok = cur.linhas && !(WIDE_RE && WIDE_RE.test(cur.arte));
        var shownCells = ok ? cells.slice(0, 40).map(function (l) { return l.slice(0, 80); }) : [];
        var shown = shownCells.map(function (l) { return l.map(function (c) { return c.ch; }).join(""); }).join("\n");
        var shownMask = mask ? maskOf(shownCells, mk) : null;
        cur.mascara = mask;
        cur.texto = cells.map(function (l) { return l.map(function (c) { return c.ch; }).join(""); }).join("\n");
        if (!ok) {
          preview.appendChild(el("p", { class: "ascii-vazio" }, "A pré-visualização aparece aqui."));
        } else if (kind === "avatar") {
          preview.appendChild(el("div", { class: "avatar-preview-item" }, avatarPreview(shown, "lg", shownMask), el("span", null, "perfil")));
          preview.appendChild(el("div", { class: "avatar-preview-item" },
            el("div", { class: "avatar-preview-comment" }, avatarPreview(shown, "sm", shownMask),
              el("div", null, el("p", { class: "bd-comment-meta" }, el("strong", null, ">>" + u.username), " · agora"), el("p", { class: "avatar-preview-body" }, "um comentário qualquer"))),
            el("span", null, "comentários")));
        } else {
          preview.appendChild(asciiBlock(shown, curFrame, "Pré-visualização", shownMask));
        }
        save.disabled = cur.erros.length > 0;
      }
      ta.addEventListener("input", function () {
        var nc = Array.from(ta.value);
        mk = shiftMask(rawChars, nc, mk);
        rawChars = nc;
        update();
      });
      update();
      ta.focus();
      cancel.addEventListener("click", function () { reload(""); });
      save.addEventListener("click", function () {
        update();
        if (cur.erros.length) return;
        save.disabled = true;
        setSt(status, "Salvando…");
        var body = K.frames ? { arte: cur.texto, cores: cur.mascara, moldura: curFrame } : { arte: cur.texto, cores: cur.mascara };
        api("PUT", K.api, body).then(function (out) {
          if (out.res.ok) reload(K.savedMsg);
          else { save.disabled = false; setSt(status, (out.data && out.data.erro) || "Não foi possível salvar.", "erro"); }
        }).catch(function () { save.disabled = false; setSt(status, "Falha de rede.", "erro"); });
      });
      if (remove) remove.addEventListener("click", function () {
        if (!confirm(K.confirmOwn)) return;
        remove.disabled = true;
        api("DELETE", K.api).then(function (out) {
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
    var meta = "No basedisso desde " + relativeTime(u.created_at);
    if (u.is_admin) meta += " · administrador";
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
    fetch("/api/users/" + encodeURIComponent(name), { headers: { Accept: "application/json" }, credentials: "same-origin" })
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
