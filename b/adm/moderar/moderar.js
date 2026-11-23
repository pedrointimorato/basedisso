(function () {
  "use strict";

  function el(tag, attrs) {
    var node = document.createElement(tag);
    var key, val, i, child;
    attrs = attrs || {};
    for (key in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, key)) continue;
      val = attrs[key];
      if (val == null) continue;
      if (key === "class") node.className = val;
      else if (key.slice(0, 2) === "on" && typeof val === "function") {
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

  function setStatus(node, text, kind) {
    node.textContent = text || "";
    node.className = "mod-status" + (kind ? " " + kind : "");
  }

  function fmtTime(iso) {
    try {
      return new Date(iso).toLocaleString("pt-BR");
    } catch (e) {
      return iso || "";
    }
  }

  var listRoot = document.getElementById("mod-list");
  var loginStatus = document.getElementById("mod-login-status");
  var listStatus = document.getElementById("mod-list-status");

  function loadList() {
    setStatus(listStatus, "Carregando…");
    fetch("/api/moderation/comments?limit=100", {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { res: res, data: data };
        });
      })
      .then(function (out) {
        if (out.res.status === 401) {
          document.body.classList.remove("mod-in");
          setStatus(loginStatus, "Entre novamente.", "erro");
          return;
        }
        if (!out.res.ok) {
          setStatus(listStatus, out.data && out.data.erro ? out.data.erro : "Falha ao listar.", "erro");
          return;
        }
        document.body.classList.add("mod-in");
        while (listRoot.firstChild) listRoot.removeChild(listRoot.firstChild);
        loadPosts();
        var items = out.data.comentarios || [];
        if (!items.length) {
          listRoot.appendChild(el("p", { class: "mod-empty" }, "Nenhum comentário ainda."));
          setStatus(listStatus, "");
          return;
        }
        items.forEach(function (c) {
          var hideBtn = el(
            "button",
            { type: "button", class: "mod-btn secondary" },
            c.hidden ? "Mostrar" : "Ocultar"
          );
          var delBtn = el("button", { type: "button", class: "mod-btn danger" }, "Apagar");
          hideBtn.addEventListener("click", function () {
            fetch("/api/moderation/comments/" + encodeURIComponent(c.id), {
              method: "PATCH",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json", Accept: "application/json" },
              body: JSON.stringify({ hidden: !c.hidden }),
            }).then(function (res) {
              if (res.ok) loadList();
              else setStatus(listStatus, "Não foi possível atualizar.", "erro");
            });
          });
          delBtn.addEventListener("click", function () {
            if (!confirm("Apagar este comentário de vez? As respostas dele também serão apagadas.")) return;
            fetch("/api/moderation/comments/" + encodeURIComponent(c.id), {
              method: "DELETE",
              credentials: "same-origin",
              headers: { Accept: "application/json" },
            }).then(function (res) {
              if (res.ok) loadList();
              else setStatus(listStatus, "Não foi possível apagar.", "erro");
            });
          });
          listRoot.appendChild(
            el(
              "article",
              { class: "mod-item" },
              el(
                "p",
                { class: "mod-meta" },
                (c.usuario && c.usuario.username && window.BDAccount)
                  ? window.BDAccount.userLink(c.usuario)
                  : el("span", { class: "mod-name" }, c.name || "anônimo"),
                " · ",
                el("span", { class: "mod-page" }, c.page || ""),
                " · ",
                fmtTime(c.created_at),
                c.parent_id ? " · resposta" : null,
                c.hidden ? el("span", { class: "mod-hidden-flag" }, "oculto") : null
              ),
              el("p", { class: "mod-body" }, c.body || ""),
              el("div", { class: "mod-actions" }, hideBtn, delBtn)
            )
          );
        });
        setStatus(listStatus, items.length + " comentário(s).");
        loadReservas();
      })
      .catch(function () {
        setStatus(listStatus, "Falha de rede.", "erro");
      });
  }



  var resRoot = document.getElementById("mod-res-list");
  var resStatus = document.getElementById("mod-res-status");

  function loadReservas() {
    if (!resRoot) return;
    setStatus(resStatus, "Carregando reservas…");
    fetch("/api/moderation/reservas", {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    })
      .then(function (res) {
        return res.json().then(function (data) { return { res: res, data: data }; });
      })
      .then(function (out) {
        if (!out.res.ok) {
          setStatus(resStatus, out.data && out.data.erro ? out.data.erro : "Falha ao listar reservas.", "erro");
          return;
        }
        while (resRoot.firstChild) resRoot.removeChild(resRoot.firstChild);
        var items = out.data.reservas || [];
        if (!items.length) {
          resRoot.appendChild(el("p", { class: "mod-empty" }, "Nenhuma reserva ainda."));
          setStatus(resStatus, "");
          return;
        }
        var table = el("table", { class: "mod-res-table" });
        var thead = el("thead", null, el("tr", null,
          el("th", null, "Nome"),
          el("th", null, "Estado"),
          el("th", null, "Nº"),
          el("th", null, "E-mail"),
          el("th", null, "Criada"),
          el("th", null, "Pagamento"),
          el("th", null, "")
        ));
        var tbody = el("tbody");
        items.forEach(function (r) {
          var payBtn = null;
          if (r.status === "pending" || r.status === "expired") {
            payBtn = el("button", { type: "button", class: "mod-btn secondary" }, "Marcar como paga");
            payBtn.addEventListener("click", function () {
              if (!confirm("Confirmar manualmente o pagamento de >>" + r.username + "?")) return;
              fetch("/api/moderation/reservas/" + encodeURIComponent(r.id), {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify({ acao: "pagar" }),
              }).then(function (res) {
                if (res.ok) loadReservas();
                else setStatus(resStatus, "Não foi possível atualizar a reserva.", "erro");
              });
            });
          }
          tbody.appendChild(el("tr", null,
            el("td", null, ">>" + (r.username || "")),
            el("td", null, el("span", { class: "mod-res-status " + (r.status || "") }, r.status || "")),
            el("td", null, r.primordial_n != null ? "#" + r.primordial_n : "—"),
            el("td", null, r.email || "—"),
            el("td", null, fmtTime(r.created_at)),
            el("td", null, r.paid_at ? fmtTime(r.paid_at) : "—"),
            el("td", null, payBtn)
          ));
        });
        table.appendChild(thead);
        table.appendChild(tbody);
        resRoot.appendChild(table);
        setStatus(resStatus, items.length + " reserva(s).");
      })
      .catch(function () {
        setStatus(resStatus, "Falha de rede ao listar reservas.", "erro");
      });
  }

  document.getElementById("mod-login-form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var input = document.getElementById("mod-password");
    var password = input.value;
    input.value = "";
    setStatus(loginStatus, "Verificando…");
    fetch("/api/moderation/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ password: password }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { res: res, data: data };
        });
      })
      .then(function (out) {
        if (!out.res.ok) {
          setStatus(loginStatus, out.data && out.data.erro ? out.data.erro : "Não autorizado.", "erro");
          return;
        }
        setStatus(loginStatus, "");
        loadList();
      })
      .catch(function () {
        setStatus(loginStatus, "Falha de rede.", "erro");
      });
  });

  document.getElementById("mod-logout").addEventListener("click", function () {
    fetch("/api/moderation/logout", { method: "POST", credentials: "same-origin" }).finally(function () {
      document.body.classList.remove("mod-in");
      while (listRoot.firstChild) listRoot.removeChild(listRoot.firstChild);
    });
  });

  // If a valid session cookie already exists, show the list.
  fetch("/api/moderation/comments?limit=1", {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  }).then(function (res) {
    if (res.ok) loadList();
  });

  var postsRoot = document.getElementById("mod-posts-list");
  var postsStatus = document.getElementById("mod-posts-status");

  function loadPosts() {
    if (!postsRoot || !postsStatus) return;
    setStatus(postsStatus, "Carregando…");
    fetch("/api/moderation/posts?limit=100", {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { res: res, data: data };
        });
      })
      .then(function (out) {
        if (out.res.status === 401) return;
        if (!out.res.ok) {
          setStatus(postsStatus, out.data && out.data.erro ? out.data.erro : "Falha ao listar postagens.", "erro");
          return;
        }
        while (postsRoot.firstChild) postsRoot.removeChild(postsRoot.firstChild);
        var items = out.data.postagens || [];
        if (!items.length) {
          postsRoot.appendChild(el("p", { class: "mod-empty" }, "Nenhuma postagem ainda."));
          setStatus(postsStatus, "");
          return;
        }
        items.forEach(function (p) {
          var hideBtn = el(
            "button",
            { type: "button", class: "mod-btn secondary" },
            p.hidden ? "Mostrar" : "Ocultar"
          );
          var delBtn = el("button", { type: "button", class: "mod-btn danger" }, "Apagar");
          hideBtn.addEventListener("click", function () {
            fetch("/api/moderation/posts/" + encodeURIComponent(p.id), {
              method: "PATCH",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json", Accept: "application/json" },
              body: JSON.stringify({ hidden: !p.hidden }),
            }).then(function (res) {
              if (res.ok) loadPosts();
            });
          });
          delBtn.addEventListener("click", function () {
            if (!confirm("Apagar esta postagem e os comentários dela?")) return;
            fetch("/api/moderation/posts/" + encodeURIComponent(p.id), {
              method: "DELETE",
              credentials: "same-origin",
              headers: { Accept: "application/json" },
            }).then(function (res) {
              if (res.ok) loadPosts();
            });
          });
          postsRoot.appendChild(
            el(
              "div",
              { class: "mod-item" },
              el(
                "p",
                { class: "mod-meta" },
                el("span", { class: "mod-name" }, p.name || "anônimo"),
                " · ",
                el("a", { class: "mod-page", href: p.url || ("/b/" + p.community + "/p/" + p.id) }, "b/" + p.community),
                " · ",
                fmtTime(p.created_at),
                p.hidden ? el("span", { class: "mod-hidden-flag" }, "oculta") : null
              ),
              el("p", { class: "mod-body" }, p.title || ""),
              p.body ? el("p", { class: "mod-body" }, p.body) : null,
              el("div", { class: "mod-actions" }, hideBtn, delBtn)
            )
          );
        });
        setStatus(postsStatus, items.length + (items.length === 1 ? " postagem." : " postagens."));
      })
      .catch(function () {
        setStatus(postsStatus, "Falha de rede ao carregar postagens.", "erro");
      });
  }
})();
