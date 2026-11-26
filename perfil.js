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
  function asciiBlock(arte, moldura, label) {
    var lines = String(arte || "").split("\n");
    var f = framedText(lines, moldura);
    var pre = el("pre", { class: "ascii-art" + (moldura === "nenhuma" ? " sem-moldura" : " com-moldura"), role: "img", "aria-label": label || "Arte ASCII" });
    pre.textContent = f.text;
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

  function avatarPreview(arte, size) {
    var n = window.BDAccount.avatarNode({ username: "", avatar: arte }, size); if (n) { n.removeAttribute("href"); } return n;
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

  function renderAsciiSection(root, data, reload) {
    var u = data.usuario;
    var art = data.ascii;
    var current = { arte: data.ascii, avatar: data.avatar };
    var section = el("section", { class: "profile-ascii", id: "perfil-ascii" });
    if (art) section.appendChild(asciiBlock(art.arte, art.moldura, "Arte ASCII de >>" + u.username));
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
    if (!art && !tools.firstChild) return null;

    function openEditor(kind) {
      var K = KINDS[kind];
      var existing = current[kind];
      if (editorHost.querySelector(".ascii-editor")) return;
      tools.hidden = true;
      var ta = el("textarea", { id: K.prefix + "-input", class: "ascii-input" + (kind === "avatar" ? " avatar-input" : ""), rows: K.rows, wrap: "off", spellcheck: "false",
        autocapitalize: "off", autocomplete: "off", "aria-label": K.title, maxlength: "4000",
        placeholder: "Desenhe com texto. Até " + K.lines + " linhas × " + K.cols + " colunas." });
      ta.value = existing ? existing.arte : "";
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
        hint, ta, counter, errBox, frames,
        el("p", { class: "ascii-preview-label" }, kind === "avatar" ? "Pré-visualização (perfil e comentários)" : "Pré-visualização (largura de celular)"),
        previewWrap,
        el("div", { class: "ascii-actions" }, save, remove, cancel)
      );
      editorHost.appendChild(editor);
      var cur = null;
      function update() {
        cur = cleanAscii(ta.value, K.lines, K.cols);
        counter.textContent = "Linhas: " + cur.linhas + "/" + K.lines + " · Colunas: " + Math.min(cur.colunas, 999) + "/" + K.cols +
          " · " + cpLen(cur.arte) + " caracteres";
        counter.className = "ascii-counter" + (cur.erros.length ? " erro" : "");
        while (errBox.firstChild) errBox.removeChild(errBox.firstChild);
        cur.erros.forEach(function (e) { errBox.appendChild(el("li", null, e)); });
        while (preview.firstChild) preview.removeChild(preview.firstChild);
        var ok = cur.linhas && !(WIDE_RE && WIDE_RE.test(cur.arte));
        var shown = ok ? cur.lines.slice(0, 40).map(function (l) { return Array.from(l).slice(0, 80).join(""); }).join("\n") : "";
        if (!ok) {
          preview.appendChild(el("p", { class: "ascii-vazio" }, "A pré-visualização aparece aqui."));
        } else if (kind === "avatar") {
          preview.appendChild(el("div", { class: "avatar-preview-item" }, avatarPreview(shown, "lg"), el("span", null, "perfil")));
          preview.appendChild(el("div", { class: "avatar-preview-item" },
            el("div", { class: "avatar-preview-comment" }, avatarPreview(shown, "sm"),
              el("div", null, el("p", { class: "bd-comment-meta" }, el("strong", null, ">>" + u.username), " · agora"), el("p", { class: "avatar-preview-body" }, "um comentário qualquer"))),
            el("span", null, "comentários")));
        } else {
          preview.appendChild(asciiBlock(shown, curFrame, "Pré-visualização"));
        }
        save.disabled = cur.erros.length > 0;
      }
      ta.addEventListener("input", update);
      update();
      ta.focus();
      cancel.addEventListener("click", function () { reload(""); });
      save.addEventListener("click", function () {
        update();
        if (cur.erros.length) return;
        save.disabled = true;
        setSt(status, "Salvando…");
        var body = K.frames ? { arte: ta.value, moldura: curFrame } : { arte: ta.value };
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
    var asciiSec = renderAsciiSection(root, data, reload);
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
      list.appendChild(
        el(
          "li",
          null,
          el("p", { class: "profile-comment-page" }, pageLink(c.page), " · ", c.created_at ? new Date(c.created_at).toLocaleString("pt-BR") : ""),
          body
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
