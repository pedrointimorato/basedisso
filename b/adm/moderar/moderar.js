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
        if (out.res.status === 401 || out.res.status === 403) {
          document.body.classList.remove("mod-in");
          setStatus(loginStatus, "Entre novamente.", "erro");
          return;
        }
        if (!out.res.ok) {
          setStatus(listStatus, out.data && out.data.erro ? out.data.erro : "Falha ao listar.", "erro");
          return;
        }
        while (listRoot.firstChild) listRoot.removeChild(listRoot.firstChild);
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
        resRoot.appendChild(el("div", { class: "mod-table-scroll" }, table));
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
        initPanel();
      })
      .catch(function () {
        setStatus(loginStatus, "Falha de rede.", "erro");
      });
  });

  document.getElementById("mod-logout").addEventListener("click", function () {
    fetch("/api/moderation/logout", { method: "POST", credentials: "same-origin" }).finally(function () {
      window.location.reload();
    });
  });

  /* ---------- ADMs (sessão de conta ou senha) ---------- */
  var adminState = null;

  function api(method, url, body) {
    var opts = { method: method, credentials: "same-origin", headers: { Accept: "application/json" } };
    if (body) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    return fetch(url, opts).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { res: res, data: data || {} };
      });
    });
  }

  function clearNode(n) {
    while (n && n.firstChild) n.removeChild(n.firstChild);
  }

  function admUser(u) {
    return window.BDAccount ? window.BDAccount.userLink(u) : el("span", { class: "mod-name" }, ">>" + u.username);
  }

  function renderSiteAdmins(list) {
    var ul = document.getElementById("mod-site-list");
    var st = document.getElementById("mod-site-status");
    clearNode(ul);
    (list || []).forEach(function (u) {
      var rm = null;
      if (!u.fundador) {
        rm = el("button", { type: "button", class: "mod-btn secondary mod-btn-sm" }, "Remover");
        rm.addEventListener("click", function () {
          if (!confirm("Remover >>" + u.username + " dos ADMs do site?")) return;
          api("DELETE", "/api/adms/site", { username: u.username }).then(function (out) {
            if (!out.res.ok) return setStatus(st, out.data.erro || "Não foi possível remover.", "erro");
            setStatus(st, ">>" + u.username + " removido.", "ok");
            refreshAdmins();
          });
        });
      }
      ul.appendChild(el("li", null, admUser(u), u.fundador ? el("span", { class: "mod-tag" }, "fundador") : null, rm));
    });
    if (!(list || []).length) ul.appendChild(el("li", { class: "mod-empty" }, "Nenhum ADM do site."));
  }

  function renderCommAdmins() {
    var sel = document.getElementById("mod-comm-select");
    var ul = document.getElementById("mod-comm-list");
    var st = document.getElementById("mod-comm-status");
    clearNode(ul);
    if (!adminState) return;
    var slug = sel.value;
    var list = (adminState.adms_comunidades || {})[slug] || [];
    list.forEach(function (u) {
      var rm = el("button", { type: "button", class: "mod-btn secondary mod-btn-sm" }, "Remover");
      rm.addEventListener("click", function () {
        if (!confirm("Remover >>" + u.username + " dos ADMs de b/" + slug + "?")) return;
        api("DELETE", "/api/adms/comunidade", { slug: slug, username: u.username }).then(function (out) {
          if (!out.res.ok) return setStatus(st, out.data.erro || "Não foi possível remover.", "erro");
          setStatus(st, ">>" + u.username + " removido de b/" + slug + ".", "ok");
          refreshAdmins();
        });
      });
      ul.appendChild(el("li", null, admUser(u), rm));
    });
    if (!list.length) ul.appendChild(el("li", { class: "mod-empty" }, "Nenhum ADM em b/" + slug + "."));
  }

  function fillCommSelect() {
    var sel = document.getElementById("mod-comm-select");
    var prev = sel.value;
    clearNode(sel);
    (adminState.comunidades || []).forEach(function (c) {
      sel.appendChild(el("option", { value: c.slug }, "b/" + c.slug));
    });
    if (prev) sel.value = prev;
    if (!sel.value && sel.options.length) sel.value = sel.options[0].value;
    renderCommAdmins();
  }

  function refreshAdmins() {
    return api("GET", "/api/adms").then(function (out) {
      if (!out.res.ok || !out.data.autorizado) return out;
      adminState = out.data;
      if (adminState.voce && adminState.voce.is_site_admin) {
        renderSiteAdmins(adminState.adms_site);
        fillCommSelect();
      }
      return out;
    });
  }

  function initPanel() {
    refreshAdmins().then(function (out) {
      if (!out.res.ok || !out.data.autorizado) {
        document.body.classList.remove("mod-in");
        if (out.data && out.data.motivo === "sem_permissao") {
          setStatus(loginStatus, "Sua conta não é ADM do site nem de nenhuma /b/.", "erro");
        }
        return;
      }
      var v = adminState.voce || {};
      document.body.classList.add("mod-in");
      document.body.classList.toggle("mod-site", !!v.is_site_admin);
      document.getElementById("mod-logout").hidden = !v.via_token;
      var who = document.getElementById("mod-whoami");
      clearNode(who);
      who.appendChild(document.createTextNode(v.username ? "Você: " : "Você entrou com a senha de administração · "));
      if (v.username) {
        who.appendChild(el("a", { class: "user-mention", href: "/@" + v.username }, ">>" + v.username));
        who.appendChild(document.createTextNode(" · "));
      }
      who.appendChild(el("strong", null, v.is_site_admin
        ? "ADM do site"
        : "ADM de " + (v.comunidades || []).map(function (s) { return "b/" + s; }).join(", ")));
      var lead = document.getElementById("mod-comments-lead");
      if (lead && !v.is_site_admin) {
        lead.textContent = "Comentários das comunidades que você modera: " + (v.comunidades || []).map(function (s) { return "b/" + s; }).join(", ") + ".";
      }
      loadList();
      loadPosts();
      if (v.is_site_admin) loadReservas();
    });
  }

  document.getElementById("mod-comm-select").addEventListener("change", renderCommAdmins);

  document.getElementById("mod-site-form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var input = document.getElementById("mod-site-user");
    var st = document.getElementById("mod-site-status");
    setStatus(st, "Adicionando…");
    api("POST", "/api/adms/site", { username: input.value }).then(function (out) {
      if (!out.res.ok) return setStatus(st, out.data.erro || "Não foi possível adicionar.", "erro");
      setStatus(st, "ADM do site adicionado.", "ok");
      input.value = "";
      refreshAdmins();
    });
  });

  document.getElementById("mod-comm-form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var input = document.getElementById("mod-comm-user");
    var st = document.getElementById("mod-comm-status");
    var slug = document.getElementById("mod-comm-select").value;
    setStatus(st, "Adicionando…");
    api("POST", "/api/adms/comunidade", { slug: slug, username: input.value }).then(function (out) {
      if (!out.res.ok) return setStatus(st, out.data.erro || "Não foi possível adicionar.", "erro");
      setStatus(st, "ADM adicionado em b/" + slug + ".", "ok");
      input.value = "";
      refreshAdmins();
    });
  });

  document.getElementById("mod-criar-form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var form = ev.target;
    var st = document.getElementById("mod-criar-status");
    var fd = new FormData(form);
    setStatus(st, "Criando…");
    api("POST", "/api/comunidades", {
      slug: String(fd.get("slug") || "").trim().toLowerCase(),
      name: String(fd.get("name") || "").trim(),
      description: String(fd.get("description") || "").trim(),
    }).then(function (out) {
      if (!out.res.ok) return setStatus(st, out.data.erro || "Não foi possível criar.", "erro");
      var c = out.data.comunidade;
      form.reset();
      clearNode(st);
      st.className = "mod-status ok";
      st.appendChild(document.createTextNode("Comunidade criada: "));
      st.appendChild(el("a", { href: c.href }, "b/" + c.slug));
      refreshAdmins();
    });
  });

  initPanel();

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
        if (out.res.status === 401 || out.res.status === 403) return;
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
