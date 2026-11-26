(function () {
  "use strict";

  function el(tag, attrs) {
    var node = document.createElement(tag);
    var key, val, i, child;
    attrs = attrs || {};
    for (key in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, key)) continue;
      val = attrs[key];
      if (val == null || val === false) continue;
      if (key === "class") node.className = val;
      else if (key === "html") node.innerHTML = val;
      else if (key.slice(0, 2) === "on" && typeof val === "function") {
        node.addEventListener(key.slice(2).toLowerCase(), val);
      } else node.setAttribute(key, val);
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

  function authorNode(p) {
    if (p.usuario && p.usuario.username && window.BDAccount) {
      var link = window.BDAccount.userLink(p.usuario, "or-author user-mention");
      if (!p.anonimo || !window.BDAccount.appendAnonExtras) return link;
      return window.BDAccount.appendAnonExtras(el("span", { class: "bd-anon-author" }, link), p);
    }
    return el("span", { class: "or-author" }, p.name || "anônimo");
  }

  function domainOf(link) {
    try {
      return new URL(link).hostname.replace(/^www\./, "");
    } catch (e) {
      return "";
    }
  }

  function pinTag() {
    return el("span", { class: "or-sticky-tag or-fixado-tag", title: "fixado por um ADM" }, el("i", { class: "fa-solid fa-thumbtack", "aria-hidden": "true" }), " fixado");
  }

  function renderPost(p, rank, podeFixar) {
    var href = p.url || "/b/" + p.community + "/p/" + p.id;
    var n = Number(p.comment_count || 0);
    var commentsLabel = n === 1 ? "1 comentário" : n + " comentários";
    var IMG = window.BDAccount && window.BDAccount.img;
    var imgSrc = p.link && IMG ? IMG.url(p.link) : null;
    var thumb = el("a", { class: "or-thumb" + (imgSrc ? " or-thumb-img" : ""), href: imgSrc ? p.link : href, "aria-hidden": "true", tabindex: "-1" });
    if (imgSrc) { thumb.setAttribute("target", "_blank"); thumb.setAttribute("rel", "noopener noreferrer nofollow"); }
    if (p.link) thumb.style.background = "var(--t-info-bg, #cee3f8)";
    thumb.appendChild(el("i", { class: p.link ? (imgSrc ? "fa-regular fa-image" : "fa-solid fa-link") : "fa-regular fa-file-lines" }));
    if (imgSrc) {
      var ti = IMG.node(imgSrc, p.link).firstChild;
      thumb.appendChild(ti);
    }
    var expando = null, expBtn = null;
    if (imgSrc) {
      expando = el("div", { class: "or-expando", hidden: "hidden" });
      expBtn = el("button", { type: "button", class: "or-expando-btn", "aria-expanded": "false", title: "mostrar imagem", "aria-label": "mostrar imagem" }, el("i", { class: "fa-solid fa-image", "aria-hidden": "true" }));
      expBtn.addEventListener("click", function () {
        var open = expando.hidden;
        if (open && !expando.firstChild) expando.appendChild(IMG.node(imgSrc, p.link, "bd-img-full"));
        expando.hidden = !open;
        expBtn.setAttribute("aria-expanded", open ? "true" : "false");
        expBtn.classList.toggle("is-open", open);
        expBtn.setAttribute("title", open ? "ocultar imagem" : "mostrar imagem");
        expBtn.setAttribute("aria-label", open ? "ocultar imagem" : "mostrar imagem");
      });
    }
    var title = el("p", { class: "or-title" }, el("a", { href: href }, p.title || "Sem título"));
    if (p.link) {
      title.appendChild(document.createTextNode(" "));
      title.appendChild(el("span", { class: "or-domain" }, "(" + (domainOf(p.link) || "link") + ")"));
    } else {
      title.appendChild(document.createTextNode(" "));
      title.appendChild(el("span", { class: "or-domain" }, "(self." + p.community + ")"));
    }
    var av = p.usuario && window.BDAccount && window.BDAccount.avatarNode ? window.BDAccount.avatarNode(p.usuario, "xs") : null;
    var tagline = el("p", { class: "or-tagline" + (av ? " has-avatar" : "") }, "enviado " + relativeTime(p.created_at) + " por ", av, authorNode(p));
    if (p.fixado) tagline.insertBefore(pinTag(), tagline.firstChild);
    if (expBtn) tagline.insertBefore(expBtn, tagline.firstChild);
    if (p.enquete) {
      var tot = Number(p.enquete.total || 0);
      tagline.appendChild(document.createTextNode(" · "));
      tagline.appendChild(el("span", { class: "or-poll-badge" + (p.enquete.encerrada ? " is-closed" : "") }, "[enquete]"));
      tagline.appendChild(document.createTextNode(" " + (tot === 1 ? "1 voto" : tot + " votos") + (p.enquete.encerrada ? " · encerrada" : "")));
    }
    var exp = p.body ? el("p", { class: "or-exp" }, p.body.length > 220 ? p.body.slice(0, 220) + "…" : p.body) : null;
    return el(
      "article",
      { class: "or-thing" + (p.fixado ? " or-fixado" : ""), "data-post-id": p.id },
      el("div", { class: "or-rank" }, String(rank)),
      el(
        "div",
        { class: "or-midcol" },
        el("button", { type: "button", class: "or-arrow or-up", "aria-label": "voto positivo" }),
        el("div", { class: "or-score", title: "pontuação" }, "1"),
        el("button", { type: "button", class: "or-arrow or-down", "aria-label": "voto negativo" })
      ),
      thumb,
      el(
        "div",
        { class: "or-entry" },
        title,
        tagline,
        expando,
        exp,
        el(
          "ul",
          { class: "or-buttons" },
          el("li", null, el("a", { href: href }, commentsLabel)),
          el("li", null, el("a", { href: href }, "compartilhar")),
          el("li", null, el("button", { type: "button", class: "or-save" }, "salvar")),
          p.proprio ? el("li", null, el("button", { type: "button", class: "or-excluir", "data-excluir-post": p.id }, "excluir")) : null,
          podeFixar
            ? el("li", null, el("button", { type: "button", class: "or-fixar", "data-fixar-post": p.id, "data-fixado": p.fixado ? "1" : "0" }, p.fixado ? "desafixar" : "fixar"))
            : null,
          p.conexao && window.BDAccount && window.BDAccount.banButton ? el("li", null, window.BDAccount.banButton("postagem", p.id, p.conexao)) : null
        ),
        p.proprio || podeFixar ? el("p", { class: "or-excluir-msg", role: "status", hidden: "hidden" }) : null
      )
    );
  }

  function bindVotes(root) {
    if (window.BDComunidadesUI && typeof window.BDComunidadesUI.bind === "function") {
      window.BDComunidadesUI.bind(root);
    }
  }

  var loadSeq = 0;

  var SORTS = { links: 1, novos: 1, melhores: 1 };
  var currentSort = "links";

  function sortFromUrl() {
    var s = "";
    try {
      s = (new URLSearchParams(location.search).get("sort") || "").toLowerCase();
    } catch (e) {
      s = "";
    }
    return SORTS[s] ? s : "links";
  }

  function markSortTab(sort) {
    var tabs = document.querySelectorAll(".or-tabmenu a[data-sort]");
    Array.prototype.forEach.call(tabs, function (a) {
      var on = a.getAttribute("data-sort") === sort;
      if (a.parentElement) a.parentElement.classList.toggle("selected", on);
      if (on) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  function bindSortTabs(slug, host) {
    var tabs = document.querySelectorAll(".or-tabmenu a[data-sort]");
    Array.prototype.forEach.call(tabs, function (a) {
      a.addEventListener("click", function (ev) {
        if (ev.button || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
        ev.preventDefault();
        var sort = a.getAttribute("data-sort");
        currentSort = SORTS[sort] ? sort : "links";
        markSortTab(currentSort);
        if (window.history && history.replaceState) {
          var q = currentSort === "links" ? "" : "?sort=" + currentSort;
          history.replaceState(null, "", location.pathname + q);
        }
        loadPosts(slug, host);
      });
    });
  }

  function loadPosts(slug, host, emptyText) {
    var seq = ++loadSeq;
    var qs = currentSort === "links" ? "" : "?sort=" + encodeURIComponent(currentSort);
    return fetch("/api/comunidades/" + encodeURIComponent(slug) + "/posts" + qs, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { res: res, data: data };
        });
      })
      .then(function (out) {
        if (seq !== loadSeq) return;
        while (host.firstChild) host.removeChild(host.firstChild);
        if (!out.res.ok) {
          host.appendChild(
            el("p", { class: "or-empty" }, out.data && out.data.erro ? out.data.erro : "Não foi possível carregar as postagens.")
          );
          return;
        }
        var posts = out.data.postagens || [];
        if (!posts.length) {
          host.appendChild(el("p", { class: "or-empty" }, emptyText || "Nenhuma postagem ainda. Seja o primeiro."));
          return;
        }
        var IMG = window.BDAccount && window.BDAccount.img;
        if (IMG && posts.some(function (p) { return p.link && IMG.url(p.link); })) {
          host.appendChild(el("p", { class: "bd-img-toggle-row or-img-toggle-row" }, IMG.toggle()));
        }
        posts.forEach(function (p, i) {
          host.appendChild(renderPost(p, i + 1, Boolean(out.data.pode_fixar)));
        });
        bindVotes(host);
      })
      .catch(function () {
        if (seq !== loadSeq) return;
        while (host.firstChild) host.removeChild(host.firstChild);
        host.appendChild(el("p", { class: "or-empty" }, "Falha de rede ao carregar as postagens."));
      });
  }

  var POLL_MAX = 6, POLL_MIN = 2, POLL_LABEL_MAX = 80;
  var POLL_PRAZOS = [["1h", "1 hora"], ["24h", "24 horas"], ["3d", "3 dias"], ["7d", "7 dias"]];
  function buildPollEditor() {
    var open = false;
    var toggle = el("button", { type: "button", class: "or-poll-toggle", "aria-expanded": "false" }, "+ Adicionar enquete");
    var list = el("ol", { class: "or-poll-opts" });
    var addBtn = el("button", { type: "button", class: "or-poll-add" }, "+ opção");
    var sel = el("select", { name: "poll_prazo", class: "or-poll-prazo" });
    POLL_PRAZOS.forEach(function (p) { var o = el("option", { value: p[0] }, p[1]); if (p[0] === "24h") o.selected = true; sel.appendChild(o); });
    var box = el("fieldset", { class: "or-poll-editor", hidden: "hidden" },
      el("legend", null, "Enquete"),
      list,
      el("p", { class: "or-poll-row" }, addBtn),
      el("label", { class: "or-poll-prazo-label" }, "Prazo ", sel),
      el("p", { class: "or-poll-hint" }, "2 a 6 opções, até 80 caracteres cada. Votar exige conta; 1 voto por conta, sem troca.")
    );
    function renumber() {
      var items = list.querySelectorAll("li");
      for (var i = 0; i < items.length; i++) {
        items[i].querySelector("input").setAttribute("placeholder", "Opção " + (i + 1));
        items[i].querySelector("input").setAttribute("aria-label", "Opção " + (i + 1));
        var rm = items[i].querySelector(".or-poll-rm");
        rm.hidden = items.length <= POLL_MIN;
      }
      addBtn.hidden = items.length >= POLL_MAX;
    }
    function addOption(v) {
      if (list.children.length >= POLL_MAX) return;
      var input = el("input", { type: "text", maxlength: String(POLL_LABEL_MAX), class: "or-poll-input", autocomplete: "off" });
      if (v) input.value = v;
      var rm = el("button", { type: "button", class: "or-poll-rm", "aria-label": "remover opção" }, "×");
      var li = el("li", null, input, rm);
      rm.addEventListener("click", function () { if (list.children.length > POLL_MIN) { list.removeChild(li); renumber(); } });
      list.appendChild(li);
      renumber();
      return input;
    }
    function reset() {
      while (list.firstChild) list.removeChild(list.firstChild);
      addOption(); addOption();
      sel.value = "24h";
      setOpen(false);
    }
    function setOpen(v) {
      open = v;
      box.hidden = !v;
      toggle.setAttribute("aria-expanded", v ? "true" : "false");
      toggle.textContent = v ? "− Remover enquete" : "+ Adicionar enquete";
    }
    toggle.addEventListener("click", function () { setOpen(!open); if (open) { var f = list.querySelector("input"); if (f) f.focus(); } });
    addBtn.addEventListener("click", function () { var i = addOption(); if (i) i.focus(); });
    reset();
    box.addEventListener("input", function () {
      var form = box.closest("form"); var st = form && form.querySelector("[data-post-status]");
      if (st && st.classList.contains("erro")) { st.textContent = ""; st.classList.remove("erro"); }
    });
    return {
      node: el("div", { class: "or-poll-wrap" }, toggle, box),
      reset: reset,
      value: function () {
        if (!open) return null;
        var vals = [], seen = {};
        var inputs = list.querySelectorAll("input");
        for (var i = 0; i < inputs.length; i++) {
          var v = inputs[i].value.replace(/\s+/g, " ").trim();
          if (!v) continue;
          if (seen[v.toLowerCase()]) return { erro: "Há opções repetidas na enquete." };
          seen[v.toLowerCase()] = 1;
          vals.push(v);
        }
        if (vals.length < POLL_MIN) return { erro: "A enquete precisa de pelo menos 2 opções preenchidas." };
        return { opcoes: vals, prazo: sel.value };
      },
    };
  }

  function bindForm(form, slug, onCreated) {
    var status = form.querySelector("[data-post-status]");
    var nameField = form.querySelector("[data-name-field]");
    var asUser = form.querySelector("[data-as-user]");
    var nameInput = form.querySelector('input[name="name"]');
    var titleInput = form.querySelector('input[name="title"]');
    var bodyInput = form.querySelector('textarea[name="body"]');
    var linkInput = form.querySelector('input[name="link"]');
    var hp = form.querySelector('input[name="website"]');
    var submit = form.querySelector('button[type="submit"]');
    var linkPreview = null;
    function updateLinkPreview() {
      var IMG = window.BDAccount && window.BDAccount.img;
      if (!linkInput || !IMG) return;
      var src = IMG.url(linkInput.value);
      if (!linkPreview) {
        linkPreview = el("div", { class: "or-link-preview", hidden: "hidden", "aria-live": "polite" });
        var lbl = linkInput.closest("label") || linkInput;
        lbl.parentNode.insertBefore(linkPreview, lbl.nextSibling);
      }
      var cur = linkPreview.getAttribute("data-src") || "";
      if ((src || "") === cur) return;
      while (linkPreview.firstChild) linkPreview.removeChild(linkPreview.firstChild);
      linkPreview.setAttribute("data-src", src || "");
      linkPreview.hidden = !src;
      if (!src) return;
      linkPreview.appendChild(el("p", { class: "or-link-preview-label" }, "Prévia da imagem:"));
      linkPreview.appendChild(IMG.node(src, linkInput.value.trim(), "bd-img-preview"));
    }
    // ---- Enquete (2 a 6 opções, prazo) ----
    var poll = buildPollEditor();
    if (linkInput) {
      var anchor = linkInput.closest("label") || linkInput;
      anchor.parentNode.insertBefore(poll.node, (linkPreview && linkPreview.parentNode === anchor.parentNode ? linkPreview : anchor).nextSibling);
    }
    if (linkInput) {
      linkInput.addEventListener("input", updateLinkPreview);
      linkInput.addEventListener("change", updateLinkPreview);
    }

    var anonBox = null;
    if (asUser && window.BDAccount && window.BDAccount.anonCheckbox) {
      anonBox = window.BDAccount.anonCheckbox("postar");
      anonBox.classList.add("bd-anon-post");
      anonBox.style.display = "none";
      asUser.parentNode.insertBefore(anonBox, asUser.nextSibling);
    }
    var tsBox = null, ts = null;
    if (submit && window.BDAccount && window.BDAccount.turnstile) {
      tsBox = el("div", { class: "bd-turnstile", hidden: "hidden" });
      var actions = submit.closest(".bd-comments-actions") || submit;
      actions.parentNode.insertBefore(tsBox, actions);
      ts = window.BDAccount.turnstile.mount(tsBox, "postagem");
    }
    var loggedIn = false;
    document.addEventListener("bd-composer-open", function () { if (ts && !loggedIn) ts.rerender(); });
    function applyUser(user) {
      loggedIn = Boolean(user && user.username);
      if (ts) { if (loggedIn) ts.hide(); else ts.show(); }
      if (!nameField || !asUser) return;
      if (user && user.username && window.BDAccount) {
        nameField.style.display = "none";
        asUser.style.display = "";
        while (asUser.firstChild) asUser.removeChild(asUser.firstChild);
        asUser.appendChild(document.createTextNode("Postar como "));
        asUser.appendChild(window.BDAccount.userLink(user));
        if (anonBox) anonBox.style.display = "";
      } else {
        nameField.style.display = "";
        asUser.style.display = "none";
        if (anonBox) { anonBox.style.display = "none"; anonBox._input.checked = false; }
      }
    }

    if (window.BDAccount && window.BDAccount.me) {
      window.BDAccount.me().then(applyUser);
    } else applyUser(null);

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (status) {
        status.textContent = "";
        status.className = "bd-comments-status";
      }
      var title = titleInput ? titleInput.value.trim() : "";
      var body = bodyInput ? bodyInput.value.trim() : "";
      var link = linkInput ? linkInput.value.trim() : "";
      if (!title) {
        if (status) {
          status.textContent = "Informe um título.";
          status.classList.add("erro");
        }
        return;
      }
      var enquete = poll.value();
      if (enquete && enquete.erro) {
        if (status) {
          status.textContent = enquete.erro;
          status.classList.add("erro");
        }
        return;
      }
      if (!body && !link && !enquete) {
        if (status) {
          status.textContent = "Escreva um texto, informe um link ou adicione uma enquete.";
          status.classList.add("erro");
        }
        return;
      }
      if (submit) submit.disabled = true;
      fetch("/api/comunidades/" + encodeURIComponent(slug) + "/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          title: title,
          body: body,
          link: link,
          enquete: enquete || undefined,
          name: nameInput ? nameInput.value : "",
          anonimo: Boolean(anonBox && anonBox.style.display !== "none" && anonBox._input.checked),
          turnstile: ts && !loggedIn ? ts.token() : undefined,
          website: hp ? hp.value : "",
        }),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { res: res, data: data };
          });
        })
        .then(function (out) {
          if (ts) ts.reset();
          if (!out.res.ok || !out.data.postagem) {
            if (status) {
              if (window.BDAccount && window.BDAccount.showError) window.BDAccount.showError(status, out.data, "Não foi possível publicar.");
              else status.textContent = out.data && out.data.erro ? out.data.erro : "Não foi possível publicar.";
              status.classList.add("erro");
            }
            return;
          }
          form.reset();
          updateLinkPreview();
          poll.reset();
          if (window.BDAccount && window.BDAccount.me) window.BDAccount.me().then(applyUser);
          else applyUser(null);
          if (status) {
            status.textContent = "Postagem publicada.";
            status.classList.add("ok");
          }
          if (typeof onCreated === "function") onCreated(out.data.postagem);
        })
        .catch(function () {
          if (ts) ts.reset();
          if (status) {
            status.textContent = "Falha de rede. Tente de novo.";
            status.classList.add("erro");
          }
        })
        .then(function () {
          if (submit) submit.disabled = false;
        });
    });
  }

  function loadPanel(host) {
    fetch("/api/comunidades", { headers: { Accept: "application/json" }, credentials: "same-origin" })
      .then(function (res) {
        return res.json().then(function (data) {
          return { res: res, data: data };
        });
      })
      .then(function (out) {
        var items = (out.data && out.data.comunidades) || [];
        items.forEach(function (c) {
          var row = host.querySelector("[data-slug=\"" + c.slug + "\"]");
          if (!row) return;
          var count = row.querySelector("[data-count]");
          var activity = row.querySelector("[data-activity]");
          if (count) {
            var n = Number(c.post_count || 0);
            count.textContent = n === 1 ? "1 postagem" : n + " postagens";
          }
          if (activity) {
            activity.textContent = c.last_activity ? "atividade " + relativeTime(c.last_activity) : "sem atividade recente";
          }
        });
      })
      .catch(function () {});
  }


  var COMPOSER_CLOSED = "[+] postar";
  var COMPOSER_OPEN_LABEL = "[-] fechar";

  function samePath(a, b) {
    function norm(p) {
      p = String(p || "/").replace(/\/+$/, "");
      return p || "/";
    }
    return norm(a) === norm(b);
  }

  function isComposerOpen() {
    var section = document.getElementById("criar");
    return !!(section && !section.hasAttribute("hidden"));
  }

  function setComposerOpen(open, opts) {
    opts = opts || {};
    var section = document.getElementById("criar");
    var btn = document.getElementById("or-postar-btn");
    if (!section || !btn) return;
    if (open) { section.removeAttribute("hidden"); try { document.dispatchEvent(new CustomEvent("bd-composer-open")); } catch (e) {} }
    else section.setAttribute("hidden", "");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.textContent = open ? COMPOSER_OPEN_LABEL : COMPOSER_CLOSED;
    if (open && opts.focus !== false) {
      var title = section.querySelector('input[name="title"]');
      if (title) {
        try {
          title.focus({ preventScroll: true });
        } catch (e) {
          title.focus();
        }
      }
    }
    if (open && opts.scroll) {
      if (typeof section.scrollIntoView === "function") {
        try {
          section.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (e) {
          section.scrollIntoView(true);
        }
      }
    }
    if (!open && location.hash === "#criar" && window.history && history.replaceState) {
      history.replaceState(null, "", location.pathname + location.search);
    }
  }

  function isLocalCriarHref(href) {
    if (!href) return false;
    if (href === "#criar") return true;
    try {
      var u = new URL(href, location.href);
      return u.hash === "#criar" && samePath(u.pathname, location.pathname);
    } catch (e) {
      return false;
    }
  }

  function bindComposer() {
    var section = document.getElementById("criar");
    var btn = document.getElementById("or-postar-btn");
    if (!section || !btn) return;

    btn.addEventListener("click", function () {
      var next = !isComposerOpen();
      setComposerOpen(next, { focus: next, scroll: false });
    });

    document.addEventListener("click", function (ev) {
      var a = ev.target && ev.target.closest ? ev.target.closest("a") : null;
      if (!a) return;
      if (ev.defaultPrevented || ev.button) return;
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      if (!isLocalCriarHref(a.getAttribute("href") || a.href)) return;
      ev.preventDefault();
      setComposerOpen(true, { focus: true, scroll: true });
      if (window.history && history.replaceState) {
        history.replaceState(null, "", location.pathname + location.search + "#criar");
      } else {
        location.hash = "criar";
      }
    });

    window.addEventListener("hashchange", function () {
      if (location.hash === "#criar") setComposerOpen(true, { focus: true, scroll: true });
    });

    var cancel = section.querySelector("[data-post-cancel]");
    if (cancel) {
      cancel.addEventListener("click", function () {
        setComposerOpen(false);
      });
    }

    if (location.hash === "#criar") {
      setComposerOpen(true, { focus: true, scroll: true });
    }
  }

  function start() {
    var host = document.getElementById("bd-posts");
    var form = document.getElementById("bd-post-form");
    var slug = (host && host.getAttribute("data-community")) || (form && form.getAttribute("data-community"));
    if (slug && host) {
      currentSort = sortFromUrl();
      markSortTab(currentSort);
      bindSortTabs(slug, host);
      loadPosts(slug, host);
    }
    if (slug && form) {
      bindForm(form, slug, function () {
        setComposerOpen(false);
        if (host) loadPosts(slug, host);
      });
    }
    bindComposer();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
