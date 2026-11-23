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
      return window.BDAccount.userLink(p.usuario, "or-author user-mention");
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

  function renderPost(p, rank) {
    var href = p.url || "/b/" + p.community + "/p/" + p.id;
    var n = Number(p.comment_count || 0);
    var commentsLabel = n === 1 ? "1 comentário" : n + " comentários";
    var thumb = el("a", { class: "or-thumb", href: href, "aria-hidden": "true" });
    if (p.link) thumb.style.background = "#cee3f8";
    thumb.appendChild(el("i", { class: p.link ? "fa-solid fa-link" : "fa-regular fa-file-lines" }));
    var title = el("p", { class: "or-title" }, el("a", { href: href }, p.title || "Sem título"));
    if (p.link) {
      title.appendChild(document.createTextNode(" "));
      title.appendChild(el("span", { class: "or-domain" }, "(" + (domainOf(p.link) || "link") + ")"));
    } else {
      title.appendChild(document.createTextNode(" "));
      title.appendChild(el("span", { class: "or-domain" }, "(self." + p.community + ")"));
    }
    var tagline = el("p", { class: "or-tagline" }, "enviado " + relativeTime(p.created_at) + " por ", authorNode(p));
    var exp = p.body ? el("p", { class: "or-exp" }, p.body.length > 220 ? p.body.slice(0, 220) + "…" : p.body) : null;
    return el(
      "article",
      { class: "or-thing", "data-post-id": p.id },
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
        exp,
        el(
          "ul",
          { class: "or-buttons" },
          el("li", null, el("a", { href: href }, commentsLabel)),
          el("li", null, el("a", { href: href }, "compartilhar")),
          el("li", null, el("button", { type: "button", class: "or-save" }, "salvar"))
        )
      )
    );
  }

  function bindVotes(root) {
    if (window.BDComunidadesUI && typeof window.BDComunidadesUI.bind === "function") {
      window.BDComunidadesUI.bind(root);
    }
  }

  function loadPosts(slug, host, emptyText) {
    return fetch("/api/comunidades/" + encodeURIComponent(slug) + "/posts", {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { res: res, data: data };
        });
      })
      .then(function (out) {
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
        posts.forEach(function (p, i) {
          host.appendChild(renderPost(p, i + 1));
        });
        bindVotes(host);
      })
      .catch(function () {
        while (host.firstChild) host.removeChild(host.firstChild);
        host.appendChild(el("p", { class: "or-empty" }, "Falha de rede ao carregar as postagens."));
      });
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

    function applyUser(user) {
      if (!nameField || !asUser) return;
      if (user && user.username && window.BDAccount) {
        nameField.style.display = "none";
        asUser.style.display = "";
        while (asUser.firstChild) asUser.removeChild(asUser.firstChild);
        asUser.appendChild(document.createTextNode("Postar como "));
        asUser.appendChild(window.BDAccount.userLink(user));
      } else {
        nameField.style.display = "";
        asUser.style.display = "none";
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
      if (!body && !link) {
        if (status) {
          status.textContent = "Escreva um texto ou informe um link.";
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
          name: nameInput ? nameInput.value : "",
          website: hp ? hp.value : "",
        }),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { res: res, data: data };
          });
        })
        .then(function (out) {
          if (!out.res.ok || !out.data.postagem) {
            if (status) {
              status.textContent = out.data && out.data.erro ? out.data.erro : "Não foi possível publicar.";
              status.classList.add("erro");
            }
            return;
          }
          form.reset();
          if (window.BDAccount && window.BDAccount.me) window.BDAccount.me().then(applyUser);
          else applyUser(null);
          if (status) {
            status.textContent = "Postagem publicada.";
            status.classList.add("ok");
          }
          if (typeof onCreated === "function") onCreated(out.data.postagem);
        })
        .catch(function () {
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

  function start() {
    var host = document.getElementById("bd-posts");
    var form = document.getElementById("bd-post-form");
    var slug = (host && host.getAttribute("data-community")) || (form && form.getAttribute("data-community"));
    if (slug && host) {
      loadPosts(slug, host);
    }
    if (slug && form) {
      bindForm(form, slug, function () {
        if (host) loadPosts(slug, host);
      });
    }
    var panel = document.getElementById("bd-comunidades");
    if (panel) loadPanel(panel);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
