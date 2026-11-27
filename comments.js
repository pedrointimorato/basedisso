(function () {
  "use strict";

  var API = "/api/comments";
  var currentUser = null;

  function el() {
    return window.BDAccount
      ? window.BDAccount.el.apply(null, arguments)
      : fallbackEl.apply(null, arguments);
  }

  function fallbackEl(tag, attrs) {
    var node = document.createElement(tag);
    var i, key, val, child;
    attrs = attrs || {};
    for (key in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, key)) continue;
      val = attrs[key];
      if (val == null) continue;
      if (key === "class") node.className = val;
      else if (key === "dataset") {
        for (var d in val) {
          if (Object.prototype.hasOwnProperty.call(val, d)) node.dataset[d] = val[d];
        }
      } else if (key.slice(0, 2) === "on" && typeof val === "function") {
        node.addEventListener(key.slice(2).toLowerCase(), val);
      } else if (key === "disabled") node.disabled = !!val;
      else node.setAttribute(key, val);
    }
    for (i = 2; i < arguments.length; i++) {
      child = arguments[i];
      if (child == null || child === false) continue;
      if (typeof child === "string" || typeof child === "number") {
        node.appendChild(document.createTextNode(String(child)));
      } else node.appendChild(child);
    }
    return node;
  }

  function relativeTime(iso) {
    var t = Date.parse(iso);
    if (Number.isNaN(t)) return "";
    var sec = Math.round((Date.now() - t) / 1000);
    if (sec < 45) return "há poucos segundos";
    var min = Math.round(sec / 60);
    if (min < 60) return min === 1 ? "há 1 minuto" : "há " + min + " minutos";
    var hr = Math.round(min / 60);
    if (hr < 24) return hr === 1 ? "há 1 hora" : "há " + hr + " horas";
    var day = Math.round(hr / 24);
    if (day < 30) return day === 1 ? "há 1 dia" : "há " + day + " dias";
    try {
      return new Date(t).toLocaleDateString("pt-BR");
    } catch (e) {
      return iso;
    }
  }

  function authorNode(c) {
    if (c.excluido) return el("span", { class: "bd-comment-name bd-comment-excluido-nome" }, "[excluído]");
    if (c.usuario && c.usuario.username && window.BDAccount) {
      var link = window.BDAccount.userLink(c.usuario, "bd-comment-name");
      if (!c.anonimo || !window.BDAccount.appendAnonExtras) return link;
      return window.BDAccount.appendAnonExtras(el("span", { class: "bd-anon-author" }, link), c);
    }
    return el("span", { class: "bd-comment-name" }, c.name || "anônimo");
  }

  function bodyNode(c) {
    if (c.excluido) return el("p", { class: "bd-comment-body bd-comment-excluido" }, c.body || "[comentário excluído pelo autor]");
    var p = el("p", { class: "bd-comment-body" });
    if (window.BDAccount && window.BDAccount.appendBodyWithMentions) {
      window.BDAccount.appendBodyWithMentions(p, c.body || "", c.mencoes || {});
    } else {
      p.appendChild(document.createTextNode(c.body || ""));
    }
    var img = window.BDAccount && window.BDAccount.img;
    // MOR-38: arquivo enviado — miniatura à esquerda, texto ao lado.
    var fig = c.midia && window.BDMidia ? window.BDMidia.node(c.midia, { nome: true, removivel: c.proprio || pinAllowed }) : null;
    if (fig) hasImages = true;
    if (!img) { if (!fig) return p; var f0 = document.createDocumentFragment(); f0.appendChild(fig); f0.appendChild(p); return f0; }
    var frag = document.createDocumentFragment();
    if (fig) frag.appendChild(fig);
    frag.appendChild(p);
    if (img.append(frag, c.body || "")) hasImages = true;
    return frag;
  }

  var widgets = [];

  function reloadWidgets(page) {
    widgets.forEach(function (w) {
      if (w.page === page && typeof w.reload === "function") w.reload();
    });
  }

  function setSentStatus(status, formOnly) {
    while (status.firstChild) status.removeChild(status.firstChild);
    if (formOnly) {
      status.appendChild(document.createTextNode("Comentário enviado para o post fixado em "));
      status.appendChild(el("a", { href: "/b/adm/", class: "bd-comments-sent-link" }, "b/adm"));
      status.appendChild(document.createTextNode("."));
    } else {
      status.appendChild(document.createTextNode("Comentário enviado."));
    }
    status.classList.add("ok");
  }

  function buildForm(page, parentId, onDone, opts) {
    opts = opts || {};
    var status = el("p", { class: "bd-comments-status", role: "status" });
    var nameInput = el("input", {
      type: "text",
      name: "name",
      maxlength: "80",
      autocomplete: "nickname",
      placeholder: "anônimo",
    });
    var nameLabel = el("label", { class: "bd-name-field" }, "Nome (opcional)", nameInput);
    var asUser = el("p", { class: "bd-as-user" });
    var anonBox = window.BDAccount && window.BDAccount.anonCheckbox ? window.BDAccount.anonCheckbox(parentId ? "responder" : "comentar") : null;
    if (anonBox) anonBox.classList.add("bd-anon-comment");
    // MOR-36: etiquetas opcionais (até 3) abaixo de "Comentar como" / anônimo.
    var tagPick = window.BDEtiquetas ? window.BDEtiquetas.picker({ page: page }) : null;
    if (tagPick) tagPick.node.classList.add("bd-tag-picker-comment");
    // MOR-38: imagem/vídeo (só para quem pode enviar nesta página).
    var midPick = window.BDMidia ? window.BDMidia.picker({ page: page }) : null;
    if (midPick) midPick.node.classList.add("bd-midia-picker-comment");
    var bodyInput = el("textarea", {
      name: "body",
      maxlength: "2000",
      rows: opts.compact ? "3" : "5",
      placeholder: "Escreva seu comentário. Você pode mencionar com >>Nome ou @Nome.",
    });
    var hp = el("input", {
      type: "text",
      name: "website",
      class: "bd-hp",
      tabindex: "-1",
      autocomplete: "off",
      "aria-hidden": "true",
    });
    var submit = el("button", { type: "submit", class: "bd-comments-submit" }, parentId ? "Responder" : "Enviar comentário");
    var tsBox = el("div", { class: "bd-turnstile", hidden: "hidden" });
    var ts = window.BDAccount && window.BDAccount.turnstile ? window.BDAccount.turnstile.mount(tsBox, "comentario") : null;
    var form = el(
      "form",
      { class: parentId ? "bd-comment-reply-form" : "bd-comments-form" },
      asUser,
      anonBox,
      tagPick ? tagPick.node : null,
      nameLabel,
      el("label", null, "Comentário", bodyInput),
      midPick ? midPick.node : null,
      hp,
      tsBox,
      el("div", { class: "bd-comments-actions" }, submit, status)
    );

    function applyUser() {
      if (currentUser && currentUser.username && window.BDAccount) {
        nameLabel.style.display = "none";
        asUser.style.display = "";
        while (asUser.firstChild) asUser.removeChild(asUser.firstChild);
        asUser.appendChild(document.createTextNode("Comentar como "));
        asUser.appendChild(window.BDAccount.userLink(currentUser));
        if (anonBox) anonBox.style.display = "";
        if (ts) ts.hide();
      } else {
        if (ts) ts.show();
        nameLabel.style.display = "";
        asUser.style.display = "none";
        if (anonBox) { anonBox.style.display = "none"; anonBox._input.checked = false; }
      }
    }
    applyUser();

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      status.textContent = "";
      status.className = "bd-comments-status";
      var body = bodyInput.value.trim();
      if (midPick && midPick.busy()) {
        status.textContent = "Espere o envio do arquivo terminar.";
        status.classList.add("erro");
        return;
      }
      var midia = midPick ? midPick.value() : undefined;
      if (!body && !midia) {
        status.textContent = midPick && midPick.pode ? "Escreva um comentário ou anexe um arquivo." : "Escreva um comentário.";
        status.classList.add("erro");
        return;
      }
      submit.disabled = true;
      fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          page: page,
          parent_id: parentId || null,
          name: nameInput.value,
          anonimo: Boolean(anonBox && anonBox.style.display !== "none" && anonBox._input.checked),
          etiquetas: tagPick ? tagPick.value() : undefined,
          turnstile: ts && !currentUser ? ts.token() : undefined,
          body: body,
          midia: midia,
          website: hp.value,
        }),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { res: res, data: data };
          });
        })
        .then(function (out) {
          if (ts) ts.reset();
          if (!out.res.ok) {
            if (window.BDAccount && window.BDAccount.showError) window.BDAccount.showError(status, out.data, "Não foi possível enviar.");
            else status.textContent = out.data && out.data.erro ? out.data.erro : "Não foi possível enviar.";
            status.classList.add("erro");
            return;
          }
          form.reset();
          if (tagPick) tagPick.reset();
          if (midPick) midPick.reset();
          applyUser();
          setSentStatus(status, !!opts.formOnly);
          if (typeof onDone === "function") onDone();
        })
        .catch(function () {
          if (ts) ts.reset();
          status.textContent = "Falha de rede. Tente de novo.";
          status.classList.add("erro");
        })
        .then(function () {
          submit.disabled = false;
        });
    });
    return form;
  }

  function deleteButton(c, page) {
    var b = el("button", { type: "button", class: "bd-comment-del-btn", "data-excluir-comentario": c.id }, "excluir");
    b.addEventListener("click", function () {
      if (!confirm("Excluir este comentário? Isso não pode ser desfeito.")) return;
      b.disabled = true;
      fetch(API + "/" + encodeURIComponent(c.id), { method: "DELETE", credentials: "same-origin", headers: { Accept: "application/json" } })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (d) {
            if (res.ok) reloadWidgets(page);
            else { b.disabled = false; alert((d && d.erro) || "Não foi possível excluir."); }
          });
        })
        .catch(function () { b.disabled = false; alert("Falha de rede."); });
    });
    return b;
  }

  // ADM que pode fixar na página sendo renderizada (renderList é síncrono).
  var pinAllowed = false;
  var hasImages = false;

  function pinButton(c, page) {
    var fixar = !c.fixado;
    var b = el("button", { type: "button", class: "bd-comment-pin-btn", "data-fixar-comentario": c.id }, fixar ? "fixar" : "desafixar");
    b.addEventListener("click", function () {
      b.disabled = true;
      fetch("/api/moderation/comments/" + encodeURIComponent(c.id), {
        method: "PATCH",
        credentials: "same-origin",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ fixado: fixar }),
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (d) {
            if (res.ok) reloadWidgets(page);
            else { b.disabled = false; alert((d && d.erro) || "Não foi possível " + (fixar ? "fixar." : "desafixar.")); }
          });
        })
        .catch(function () { b.disabled = false; alert("Falha de rede."); });
    });
    return b;
  }

  // MOR-35: ADM que pode ver "quem votou" nesta página (vem da API: ver_votos).
  var verVotos = false;
  var podeEtiquetar = false;

  // MOR-36: chips de etiqueta do comentário + botão "etiquetas" (autor com conta ou ADM da página).
  function tagParts(c, page) {
    if (c.excluido || !c.id || !window.BDEtiquetas) return { chips: null, btn: null };
    var o = { tipo: "comment", id: c.id, page: page, lista: c.etiquetas || [], adm: podeEtiquetar, onChange: function (l) { c.etiquetas = l; } };
    var h = window.BDEtiquetas.host(o);
    return { chips: h, btn: c.proprio || podeEtiquetar ? el("span", { class: "bd-tag-anchor" }, window.BDEtiquetas.editButton(h, o)) : null };
  }

  function voteBar(c) {
    if (c.excluido || !c.id || !window.BDVotos) return null;
    var v = c.votos || {};
    return window.BDVotos.bar({ tipo: "comment", id: c.id, score: v.score, meu: v.meu, nota_media: v.nota_media, nota_total: v.nota_total,
      minha_nota: v.minha_nota, proprio: Boolean(c.proprio), adm: verVotos, onChange: function (nv) { c.votos = nv; } });
  }

  function renderComment(c, page, reload, closed) {
    var replyWrap = el("div", { class: "bd-comment-actions-row" });
    var votos = voteBar(c);
    var tg = tagParts(c, page);
    var avatar = c.excluido ? null : c.usuario && window.BDAccount && window.BDAccount.avatarNode ? window.BDAccount.avatarNode(c.usuario, "sm") : null;
    var main = el("div", { class: "bd-comment-main" },
      el("p", { class: "bd-comment-meta" },
        c.fixado ? el("span", { class: "bd-comment-fixado", title: "fixado por um ADM" }, el("i", { class: "fa-solid fa-thumbtack", "aria-hidden": "true" }), " fixado") : null,
        authorNode(c), " · ", el("time", { datetime: c.created_at || "" }, relativeTime(c.created_at)), tg.chips ? " " : null, tg.chips),
      bodyNode(c),
      votos ? el("div", { class: "bd-comment-foot" }, votos, replyWrap) : replyWrap
    );
    var item = el(
      "li",
      { class: "bd-comment" + (c.fixado ? " bd-comment-pinned" : ""), id: c.id ? "c-" + c.id : undefined, dataset: { id: c.id } },
      el("div", { class: "bd-comment-row" + (avatar ? " has-avatar" : "") }, avatar, main)
    );
    var open = false;
    var btn = el("button", { type: "button", class: "bd-comment-reply-btn" }, "responder");
    var delBtn = c.proprio && !c.excluido ? deleteButton(c, page) : null;
    var banBtn = c.conexao && !c.excluido && window.BDAccount && window.BDAccount.banButton ? window.BDAccount.banButton("comentario", c.id, c.conexao) : null;
    if (banBtn) banBtn.classList.add("bd-comment-ban-btn");
    var pinBtn = pinAllowed && !c.parent_id && (!c.excluido || c.fixado) ? pinButton(c, page) : null;
    function extras() {
      if (tg.btn) replyWrap.appendChild(tg.btn);
      if (delBtn) replyWrap.appendChild(delBtn);
      if (pinBtn) replyWrap.appendChild(pinBtn);
      if (banBtn) replyWrap.appendChild(banBtn);
    }
    if (c.excluido || closed) {
      extras();
      return item;
    }
    replyWrap.appendChild(btn);
    extras();
    btn.addEventListener("click", function () {
      if (open) {
        while (replyWrap.firstChild) replyWrap.removeChild(replyWrap.firstChild);
        replyWrap.appendChild(btn);
        extras();
        open = false;
        return;
      }
      open = true;
      var cancel = el("button", { type: "button", class: "bd-comment-cancel" }, "cancelar");
      var form = buildForm(page, c.id, function () { reloadWidgets(page); });
      cancel.addEventListener("click", function () {
        while (replyWrap.firstChild) replyWrap.removeChild(replyWrap.firstChild);
        replyWrap.appendChild(btn);
        extras();
        open = false;
      });
      while (replyWrap.firstChild) replyWrap.removeChild(replyWrap.firstChild);
      replyWrap.appendChild(form);
      replyWrap.appendChild(cancel);
    });
    return item;
  }

  function appendThread(list, comment, page, reload, byParent, depth, closed) {
    var item = renderComment(comment, page, reload, closed);
    var kids = byParent[comment.id] || [];
    if (kids.length) {
      var subClass = "bd-comment-replies" + (depth >= 4 ? " bd-comment-replies-cap" : "");
      var sub = el("ul", { class: subClass });
      kids.forEach(function (k) {
        appendThread(sub, k, page, reload, byParent, depth + 1, closed);
      });
      item.appendChild(sub);
    }
    list.appendChild(item);
  }

  function renderList(root, comments, page, reload, closed, podeFixar) {
    pinAllowed = Boolean(podeFixar);
    hasImages = false;
    var list = el("ul", { class: "bd-comment-list" });
    var byParent = {};
    var tops = [];
    (comments || []).forEach(function (c) {
      if (c.parent_id) {
        if (!byParent[c.parent_id]) byParent[c.parent_id] = [];
        byParent[c.parent_id].push(c);
      } else {
        tops.push(c);
      }
    });
    if (!tops.length && !(comments || []).length) {
      root.appendChild(el("p", { class: "bd-comments-empty" }, closed ? "Nenhum comentário." : "Nenhum comentário ainda. Seja o primeiro."));
      return;
    }
    // Fixados primeiro (o mais recente no topo); o resto na ordem de sempre.
    var pinned = tops.filter(function (c) { return c.fixado; }).sort(function (a, b) {
      return String(b.fixado_em || "").localeCompare(String(a.fixado_em || ""));
    });
    tops = pinned.concat(tops.filter(function (c) { return !c.fixado; }));
    tops.forEach(function (c) {
      appendThread(list, c, page, reload, byParent, 0, closed);
    });
    if (hasImages && window.BDAccount.img.toggle) root.appendChild(el("p", { class: "bd-img-toggle-row" }, window.BDAccount.img.toggle()));
    root.appendChild(list);
  }

  function mount(box) {
    if (box.getAttribute("data-bd-mounted")) return;
    box.setAttribute("data-bd-mounted", "1");
    var page = box.getAttribute("data-page") || "";
    var title = box.getAttribute("data-title") || "Comentários";
    var formOnly = box.getAttribute("data-form-only") === "true";
    var closed = box.getAttribute("data-closed") === "true";
    var formNode = null;
    var compact = formOnly || box.classList.contains("bd-comments-sidebar");
    var listHost = formOnly ? null : el("div", { class: "bd-comments-thread" });

    function reload() {
      if (formOnly || !listHost) return;
      fetch(API + "?page=" + encodeURIComponent(page), {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { res: res, data: data };
          });
        })
        .then(function (out) {
          while (listHost.firstChild) listHost.removeChild(listHost.firstChild);
          if (!out.res.ok) {
            listHost.appendChild(
              el("p", { class: "bd-comments-status erro" }, out.data && out.data.erro ? out.data.erro : "Não foi possível carregar os comentários.")
            );
            return;
          }
          if (out.data.fechado && !closed) {
            closed = true;
            if (formNode && formNode.parentNode) formNode.parentNode.replaceChild(closedNote(), formNode);
          }
          verVotos = Boolean(out.data.ver_votos);
          podeEtiquetar = Boolean(out.data.pode_etiquetar);
          renderList(listHost, out.data.comentarios || [], page, function () {
            reloadWidgets(page);
          }, closed, out.data.pode_fixar);
        })
        .catch(function () {
          while (listHost.firstChild) listHost.removeChild(listHost.firstChild);
          listHost.appendChild(el("p", { class: "bd-comments-status erro" }, "Falha de rede ao carregar comentários."));
        });
    }

    widgets.push({ page: page, box: box, reload: reload, formOnly: formOnly });
    if (!formOnly) box.appendChild(el("h2", { class: "bd-comments-title" }, title));
    function closedNote() {
      return el("p", { class: "bd-comments-fechados" }, "Comentários fechados: a postagem foi excluída pelo autor.");
    }
    formNode = closed ? closedNote() : buildForm(page, null, function () {
      reloadWidgets(page);
    }, { formOnly: formOnly, compact: compact });
    box.appendChild(formNode);
    if (!formOnly) {
      box.appendChild(listHost);
      reload();
    }
  }

  function start() {
    var go = function () {
      var nodes = document.querySelectorAll(".bd-comments");
      for (var i = 0; i < nodes.length; i++) mount(nodes[i]);
    };
    if (window.BDAccount && window.BDAccount.me) {
      window.BDAccount.me().then(function (user) {
        currentUser = user;
        go();
      });
    } else {
      go();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
