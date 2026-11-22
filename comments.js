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
    if (c.usuario && c.usuario.username && window.BDAccount) {
      return window.BDAccount.userLink(c.usuario, "bd-comment-name");
    }
    return el("span", { class: "bd-comment-name" }, c.name || "anônimo");
  }

  function bodyNode(c) {
    var p = el("p", { class: "bd-comment-body" });
    if (window.BDAccount && window.BDAccount.appendBodyWithMentions) {
      window.BDAccount.appendBodyWithMentions(p, c.body || "", c.mencoes || {});
    } else {
      p.appendChild(document.createTextNode(c.body || ""));
    }
    return p;
  }

  function buildForm(page, parentId, onDone) {
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
    var bodyInput = el("textarea", {
      name: "body",
      maxlength: "2000",
      required: "required",
      rows: "5",
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
    var form = el(
      "form",
      { class: parentId ? "bd-comment-reply-form" : "bd-comments-form" },
      asUser,
      nameLabel,
      el("label", null, "Comentário", bodyInput),
      hp,
      el("div", { class: "bd-comments-actions" }, submit, status)
    );

    function applyUser() {
      if (currentUser && currentUser.username && window.BDAccount) {
        nameLabel.style.display = "none";
        asUser.style.display = "";
        while (asUser.firstChild) asUser.removeChild(asUser.firstChild);
        asUser.appendChild(document.createTextNode("Comentar como "));
        asUser.appendChild(window.BDAccount.userLink(currentUser));
      } else {
        nameLabel.style.display = "";
        asUser.style.display = "none";
      }
    }
    applyUser();

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      status.textContent = "";
      status.className = "bd-comments-status";
      var body = bodyInput.value.trim();
      if (!body) {
        status.textContent = "Escreva um comentário.";
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
          body: body,
          website: hp.value,
        }),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { res: res, data: data };
          });
        })
        .then(function (out) {
          if (!out.res.ok) {
            status.textContent = out.data && out.data.erro ? out.data.erro : "Não foi possível enviar.";
            status.classList.add("erro");
            return;
          }
          form.reset();
          applyUser();
          status.textContent = "Comentário enviado.";
          status.classList.add("ok");
          if (typeof onDone === "function") onDone();
        })
        .catch(function () {
          status.textContent = "Falha de rede. Tente de novo.";
          status.classList.add("erro");
        })
        .then(function () {
          submit.disabled = false;
        });
    });
    return form;
  }

  function renderComment(c, page, reload) {
    var replyWrap = el("div");
    var item = el(
      "li",
      { class: "bd-comment", dataset: { id: c.id } },
      el("p", { class: "bd-comment-meta" }, authorNode(c), " · ", el("time", { datetime: c.created_at || "" }, relativeTime(c.created_at))),
      bodyNode(c),
      replyWrap
    );
    if (!c.parent_id) {
      var open = false;
      var btn = el("button", { type: "button", class: "bd-comment-reply-btn" }, "responder");
      replyWrap.appendChild(btn);
      btn.addEventListener("click", function () {
        if (open) {
          while (replyWrap.firstChild) replyWrap.removeChild(replyWrap.firstChild);
          replyWrap.appendChild(btn);
          open = false;
          return;
        }
        open = true;
        var cancel = el("button", { type: "button", class: "bd-comment-cancel" }, "cancelar");
        var form = buildForm(page, c.id, reload);
        cancel.addEventListener("click", function () {
          while (replyWrap.firstChild) replyWrap.removeChild(replyWrap.firstChild);
          replyWrap.appendChild(btn);
          open = false;
        });
        while (replyWrap.firstChild) replyWrap.removeChild(replyWrap.firstChild);
        replyWrap.appendChild(form);
        replyWrap.appendChild(cancel);
      });
    }
    return item;
  }

  function renderList(root, comments, page, reload) {
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
      root.appendChild(el("p", { class: "bd-comments-empty" }, "Nenhum comentário ainda. Seja o primeiro."));
      return;
    }
    tops.forEach(function (c) {
      var item = renderComment(c, page, reload);
      var kids = byParent[c.id] || [];
      if (kids.length) {
        var sub = el("ul", { class: "bd-comment-replies" });
        kids.forEach(function (k) {
          sub.appendChild(renderComment(k, page, reload));
        });
        item.appendChild(sub);
      }
      list.appendChild(item);
    });
    root.appendChild(list);
  }

  function mount(box) {
    var page = box.getAttribute("data-page") || "";
    var title = box.getAttribute("data-title") || "Comentários";
    var listHost = el("div", { class: "bd-comments-thread" });

    function reload() {
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
          renderList(listHost, out.data.comentarios || [], page, reload);
        })
        .catch(function () {
          while (listHost.firstChild) listHost.removeChild(listHost.firstChild);
          listHost.appendChild(el("p", { class: "bd-comments-status erro" }, "Falha de rede ao carregar comentários."));
        });
    }

    box.appendChild(el("h2", { class: "bd-comments-title" }, title));
    box.appendChild(buildForm(page, null, reload));
    box.appendChild(listHost);
    reload();
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
