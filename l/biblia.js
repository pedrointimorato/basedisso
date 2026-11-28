/* Bíblia Amarela: renderização segura (texto → HTML escapado) + edição inline para ADMs do site. */
(function (root) {
  "use strict";

  // ---------- Renderização (também usada no Node para gerar o HTML estático) ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function slugify(s) {
    return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "secao";
  }
  function safeUrl(u) {
    u = String(u || "").trim();
    if (/^https?:\/\/[^\s"'<>]+$/i.test(u)) return { href: u, ext: true };
    if (/^\/(?!\/)[^\s"'<>]*$/.test(u) || /^#[A-Za-z0-9_-]+$/.test(u)) return { href: u, ext: false };
    return null;
  }
  // Inline: **negrito**, *itálico*, [texto](url), >>Nome. Tudo escapado antes; só tags fixas são inseridas.
  function inline(text) {
    var slots = [];
    function slot(html) { slots.push(html); return "\u0000" + (slots.length - 1) + "\u0000"; }
    var s = String(text == null ? "" : text).replace(/\u0000/g, "");
    s = s.replace(/\[([^\]\n]{1,300})\]\(([^)\s]{1,600})\)/g, function (m, label, url) {
      var u = safeUrl(url);
      if (!u) return m;
      return slot('<a href="' + esc(u.href) + '"' + (u.ext ? ' target="_blank" rel="noopener noreferrer"' : "") + ">" + inlineBasic(esc(label)) + "</a>");
    });
    s = esc(s);
    s = inlineBasic(s, true);
    return s.replace(/\u0000(\d+)\u0000/g, function (m, i) { return slots[Number(i)]; });
  }
  function inlineBasic(h, mentions) {
    h = h.replace(/\*\*([^*\n](?:[^*\n]|\*(?!\*))*?)\*\*/g, "<strong>$1</strong>");
    h = h.replace(/(^|[^*\w])\*([^*\s](?:[^*\n]*?[^*\s])?)\*(?!\*)/g, "$1<em>$2</em>");
    if (mentions) h = h.replace(/&gt;&gt;([A-Za-z0-9_]{3,20})(?![A-Za-z0-9_])/g, '<a href="/@$1" class="user-mention">&gt;&gt;$1</a>');
    return h;
  }
  function blocks(text, ids, headsOut) {
    var t = String(text || "").replace(/\r\n?/g, "\n").trim();
    if (!t) return "";
    return t.split(/\n[ \t]*\n+/).map(function (b) {
      b = b.replace(/^\n+|\n+$/g, "");
      var lines = b.split("\n");
      var m = /^(#{1,3})\s+(.+)$/.exec(b);
      if (m && lines.length === 1) {
        var tag = m[1].length === 3 ? "h3" : "h2";
        var id = uniqueId(slugify(m[2].replace(/[*\[\]()]/g, "")), ids);
        if (tag === "h2" && headsOut) headsOut.push({ id: id, html: inline(m[2]) });
        return "<" + tag + ' id="' + id + '">' + inline(m[2]) + "</" + tag + ">";
      }
      if (lines.every(function (l) { return /^>\s?/.test(l); })) {
        return "<blockquote><p>" + lines.map(function (l) { return inline(l.replace(/^>\s?/, "")); }).join("<br>") + "</p></blockquote>";
      }
      if (lines.every(function (l) { return /^[-*]\s+/.test(l); })) {
        return "<ul>" + lines.map(function (l) { return "<li>" + inline(l.replace(/^[-*]\s+/, "")) + "</li>"; }).join("") + "</ul>";
      }
      if (lines.every(function (l) { return /^\d{1,3}[.)]\s+/.test(l); })) {
        var start = parseInt(lines[0], 10);
        return "<ol class=\"book-verses\"" + (start !== 1 ? ' start="' + start + '"' : "") + ">" + lines.map(function (l) { return "<li>" + inline(l.replace(/^\d{1,3}[.)]\s+/, "")) + "</li>"; }).join("") + "</ol>";
      }
      return "<p>" + lines.map(inline).join("<br>") + "</p>";
    }).join("\n");
  }
  function uniqueId(base, ids) {
    var id = base, i = 2;
    while (ids[id]) id = base + "-" + i++;
    ids[id] = true;
    return id;
  }
  function escrito(l) { return Boolean(String(l.texto || "").trim()); }

  // Retorna { cabecalho, toc, livros, fontes } (HTML) a partir do documento.
  function renderDoc(doc) {
    var ids = { "a-biblia-amarela": true, "sumario": true, "comentarios": true, "ba-livros": true };
    (doc.livros || []).forEach(function (l) { ids[l.id] = true; });
    var meta = doc.meta || {};
    var cab = '<h1 id="a-biblia-amarela">' + esc(meta.titulo) + "</h1>\n" + blocks(meta.intro, ids, null);
    var livrosHtml = [], tocItems = [];
    (doc.livros || []).forEach(function (l) {
      if (escrito(l)) {
        var heads = [];
        var body = blocks(l.texto, ids, heads);
        livrosHtml.push('<section class="book-body" id="' + esc(l.id) + '" data-livro="' + esc(l.id) + '">\n<h1>' + esc(l.titulo) + "</h1>\n" +
          (l.credito ? '<p class="book-credit">' + inline(l.credito) + "</p>\n" : "") + body + "\n</section>");
        tocItems.push('<li data-livro="' + esc(l.id) + '"><a href="#' + esc(l.id) + '">' + esc(l.titulo) + "</a>" +
          (heads.length ? "<ol>" + heads.map(function (h) { return '<li><a href="#' + h.id + '">' + h.html + "</a></li>"; }).join("") + "</ol>" : "") + "</li>");
      } else {
        tocItems.push('<li class="toc-pending" data-livro="' + esc(l.id) + '">' + esc(l.titulo) + " <em>" + esc(l.nota_pendente || "ainda não escrito") + "</em></li>");
      }
    });
    return {
      cabecalho: cab,
      toc: '<h2 id="sumario">Sumário</h2>\n<ol>' + tocItems.join("") + "</ol>",
      livros: livrosHtml.join("\n"),
      fontes: inline(meta.fontes || "").replace(/\n/g, "<br>"),
    };
  }

  var api = { esc: esc, inline: inline, blocks: blocks, renderDoc: renderDoc, escrito: escrito, slugify: slugify };
  if (typeof module !== "undefined" && module.exports) { module.exports = api; return; }
  root.BDBiblia = api;

  // ---------- Navegador ----------
  var doc = null, podeEditar = false, editorAberto = null;
  var $ = function (id) { return document.getElementById(id); };
  function fmt(iso) { try { return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }); } catch (e) { return iso || ""; } }
  function editadoTxt(e) { return e && e.por ? "Última edição por >>" + e.por + " em " + fmt(e.em) : ""; }
  function h(tag, attrs) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    }
    for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c == null || c === false) continue; n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); }
    return n;
  }

  function paint() {
    closeEditor();
    var r = renderDoc(doc);
    $("ba-cabecalho").innerHTML = r.cabecalho;
    $("ba-toc").innerHTML = r.toc;
    $("ba-livros").innerHTML = r.livros;
    $("ba-fontes").innerHTML = r.fontes;
    $("ba-fontes").hidden = !r.fontes;
    document.title = (doc.meta.titulo_capa || doc.meta.titulo) + " — basedisso";
    if (podeEditar) decorate();
  }

  function api$(method, path, body) {
    return fetch("/api/l/biblia-amarela" + path, {
      method: method, credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json", Accept: "application/json" } : { Accept: "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (d) {
        if (!res.ok) throw new Error((d && d.erro) || "Não foi possível salvar (" + res.status + ").");
        return d;
      });
    });
  }

  function flash(msg, kind) {
    var s = $("ba-adm-status");
    if (!s) return;
    s.textContent = msg; s.className = "ba-adm-status" + (kind ? " " + kind : "");
  }

  function decorate() {
    var bar = $("ba-admbar");
    if (!bar) {
      bar = h("div", { id: "ba-admbar", class: "ba-admbar", role: "region", "aria-label": "Edição da Bíblia Amarela" });
      $("ba-cabecalho").parentNode.insertBefore(bar, $("ba-cabecalho"));
    }
    bar.innerHTML = "";
    bar.appendChild(h("span", { class: "ba-admbar-label", text: "Modo ADM" }));
    bar.appendChild(h("button", { type: "button", class: "ba-btn", id: "ba-edit-cab", onclick: openCabecalho }, "Editar cabeçalho / introdução"));
    bar.appendChild(h("button", { type: "button", class: "ba-btn", id: "ba-add-livro", onclick: function () { openLivro(null); } }, "+ Adicionar livro"));
    bar.appendChild(h("span", { class: "ba-adm-meta", id: "ba-adm-meta", text: editadoTxt(doc.editado) }));
    bar.appendChild(h("span", { class: "ba-adm-status", id: "ba-adm-status", role: "status", "aria-live": "polite" }));
    // Editar em cada livro (escritos: no topo da seção; não escritos: no sumário)
    (doc.livros || []).forEach(function (l) {
      var btn = h("button", { type: "button", class: "ba-btn ba-btn-sm ba-edit-livro", "data-livro": l.id, onclick: function () { openLivro(l.id); } }, "Editar");
      var sec = document.querySelector('#ba-livros section[data-livro="' + cssEsc(l.id) + '"]');
      if (sec) {
        sec.insertBefore(h("div", { class: "ba-livro-acoes" }, btn), sec.firstChild);
      } else {
        var li = document.querySelector('#ba-toc li.toc-pending[data-livro="' + cssEsc(l.id) + '"]');
        if (li) li.appendChild(btn);
      }
    });
  }
  function cssEsc(s) { return String(s).replace(/["\\]/g, "\\$&"); }

  function field(label, input, hint) {
    var id = "ba-f-" + Math.random().toString(36).slice(2, 8);
    input.id = id;
    return h("div", { class: "ba-field" }, h("label", { for: id, text: label }), input, hint ? h("p", { class: "ba-hint", text: hint }) : null);
  }
  function ajuda() {
    return h("details", { class: "ba-ajuda" }, h("summary", { text: "Como formatar" }),
      h("ul", null,
        h("li", { text: "Linha em branco separa parágrafos; Enter simples quebra a linha." }),
        h("li", { text: "## Capítulo I → subtítulo (entra no sumário) · ### → subtítulo menor" }),
        h("li", { text: "**negrito** · *itálico* · > citação · - lista · 1. versículos numerados" }),
        h("li", { text: "[texto](https://link) → link · >>Nome → menção" })));
  }
  function closeEditor() {
    if (editorAberto && editorAberto.restore) editorAberto.restore();
    editorAberto = null;
  }
  function mountEditor(anchor, mode, form) {
    closeEditor();
    var hiddenEls = [];
    if (mode === "replace") { anchor.parentNode.insertBefore(form, anchor); anchor.hidden = true; hiddenEls.push(anchor); }
    else anchor.parentNode.insertBefore(form, anchor.nextSibling);
    editorAberto = { restore: function () { form.remove(); hiddenEls.forEach(function (e) { e.hidden = false; }); } };
    var first = form.querySelector("input, textarea");
    if (first) try { first.focus({ preventScroll: true }); } catch (e) { first.focus(); }
    form.scrollIntoView({ block: "start", behavior: "auto" });
  }
  function actions(onSave, extra) {
    var st = h("span", { class: "ba-form-status", role: "status", "aria-live": "polite" });
    var save = h("button", { type: "submit", class: "ba-btn ba-btn-primary" }, "Salvar");
    var cancel = h("button", { type: "button", class: "ba-btn", onclick: function () { closeEditor(); } }, "Cancelar");
    var row = h("div", { class: "ba-form-actions" }, save, cancel);
    (extra || []).forEach(function (e) { row.appendChild(e); });
    row.appendChild(st);
    return { row: row, st: st, save: save };
  }
  function submitWith(form, a, run) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      a.save.disabled = true; a.st.className = "ba-form-status"; a.st.textContent = "Salvando…";
      run().then(function (d) {
        doc = d; paint(); flash("Salvo.", "ok");
      }).catch(function (e) {
        a.save.disabled = false; a.st.className = "ba-form-status erro"; a.st.textContent = e.message || "Falha ao salvar.";
      });
    });
  }

  function openCabecalho() {
    var m = doc.meta;
    var titulo = h("input", { type: "text", maxlength: "120", required: true }); titulo.value = m.titulo || "";
    var capa = h("input", { type: "text", maxlength: "80", required: true }); capa.value = m.titulo_capa || "";
    var sub = h("input", { type: "text", maxlength: "240" }); sub.value = m.subtitulo || "";
    var intro = h("textarea", { rows: "7", maxlength: "8000" }); intro.value = m.intro || "";
    var fontes = h("textarea", { rows: "2", maxlength: "2000" }); fontes.value = m.fontes || "";
    var a = actions();
    var form = h("form", { class: "ba-editor", id: "ba-editor-cab", "aria-label": "Editar cabeçalho e introdução" },
      h("h3", { class: "ba-editor-title", text: "Cabeçalho e introdução" }),
      m.editado ? h("p", { class: "ba-editor-meta", text: editadoTxt(m.editado) }) : null,
      field("Título da página", titulo),
      field("Título na capa (estante /l/)", capa),
      field("Subtítulo da capa", sub),
      field("Introdução", intro),
      field("Fontes (rodapé)", fontes),
      ajuda(), a.row);
    submitWith(form, a, function () { return api$("PUT", "/meta", { titulo: titulo.value, titulo_capa: capa.value, subtitulo: sub.value, intro: intro.value, fontes: fontes.value }); });
    mountEditor($("ba-cabecalho"), "replace", form);
  }

  function openLivro(id) {
    var idx = -1, l = { titulo: "", credito: "", texto: "", nota_pendente: "ainda não escrito" };
    if (id) { idx = doc.livros.findIndex(function (x) { return x.id === id; }); if (idx < 0) return; l = doc.livros[idx]; }
    var titulo = h("input", { type: "text", maxlength: "120", required: true }); titulo.value = l.titulo;
    var credito = h("input", { type: "text", maxlength: "400", placeholder: "ex.: Texto da wiki do r/BrasilSocial, por >>Nome." }); credito.value = l.credito || "";
    var texto = h("textarea", { rows: "18", maxlength: "120000", class: "ba-texto", placeholder: "Vazio = livro “ainda não escrito”." }); texto.value = l.texto || "";
    var nota = h("input", { type: "text", maxlength: "120" }); nota.value = l.nota_pendente || "ainda não escrito";
    var extra = [];
    if (id) {
      if (idx > 0) extra.push(h("button", { type: "button", class: "ba-btn", title: "Mover para cima", onclick: function () { move(idx, -1); } }, "↑ Subir"));
      if (idx < doc.livros.length - 1) extra.push(h("button", { type: "button", class: "ba-btn", title: "Mover para baixo", onclick: function () { move(idx, 1); } }, "↓ Descer"));
      extra.push(h("button", { type: "button", class: "ba-btn ba-btn-danger", onclick: function () { remove(l); } }, "Remover livro"));
    }
    var a = actions(null, extra);
    var form = h("form", { class: "ba-editor", id: "ba-editor-livro", "data-livro": id || "", "aria-label": id ? "Editar livro" : "Adicionar livro" },
      h("h3", { class: "ba-editor-title", text: id ? "Editar livro: " + l.titulo : "Adicionar livro" }),
      l.editado ? h("p", { class: "ba-editor-meta", text: editadoTxt(l.editado) }) : null,
      field("Título do livro", titulo),
      field("Crédito (opcional)", credito),
      field("Texto", texto, "Deixe vazio para o livro aparecer no sumário como “" + (l.nota_pendente || "ainda não escrito") + "”. Ao escrever, ele vira um livro publicado."),
      field("Aviso quando ainda não escrito", nota),
      ajuda(), a.row);
    submitWith(form, a, function () {
      var body = { titulo: titulo.value, credito: credito.value, texto: texto.value, nota_pendente: nota.value };
      return id ? api$("PUT", "/livros/" + encodeURIComponent(id), body) : api$("POST", "/livros", body);
    });
    var sec = id && document.querySelector('#ba-livros section[data-livro="' + cssEsc(id) + '"]');
    if (sec) mountEditor(sec, "replace", form);
    else if (id) mountEditor($("ba-toc"), "after", form);
    else mountEditor($("ba-livros").lastElementChild || $("ba-toc"), "after", form);
  }
  function move(idx, dir) {
    var ids = doc.livros.map(function (x) { return x.id; });
    var j = idx + dir; var t = ids[idx]; ids[idx] = ids[j]; ids[j] = t;
    flash("Salvando ordem…");
    api$("POST", "/ordem", { ids: ids }).then(function (d) { doc = d; paint(); flash("Ordem salva.", "ok"); }).catch(function (e) { flash(e.message, "erro"); });
  }
  function remove(l) {
    if (!confirm("Remover o livro “" + l.titulo + "” da Bíblia Amarela? Esta ação não pode ser desfeita.")) return;
    flash("Removendo…");
    api$("DELETE", "/livros/" + encodeURIComponent(l.id)).then(function (d) { doc = d; paint(); flash("Livro removido.", "ok"); }).catch(function (e) { flash(e.message, "erro"); });
  }

  function init() {
    if (!$("ba-cabecalho")) return;
    fetch("/api/l/biblia-amarela", { credentials: "same-origin", headers: { Accept: "application/json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.meta || !Array.isArray(d.livros)) return;
        doc = d; podeEditar = d.pode_editar === true;
        if (d.origem === "padrao" && !podeEditar) return; // HTML estático já é idêntico ao padrão
        var hash = location.hash;
        paint();
        if (hash && hash.length > 1) { var t = document.getElementById(hash.slice(1)); if (t) t.scrollIntoView(); }
      })
      .catch(function () {});
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : this);
