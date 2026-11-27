/* Painel /b: unir-se/membro em cada /b/<slug>, lista dinâmica de comunidades, criação de /b (só ADM do site),
   ADMs de cada comunidade e a página /b/membros/. */
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

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  function getJson(url, opts) {
    opts = opts || {};
    opts.credentials = "same-origin";
    opts.headers = opts.headers || {};
    opts.headers.Accept = "application/json";
    return fetch(url, opts).then(function (res) {
      return res
        .json()
        .catch(function () {
          return {};
        })
        .then(function (data) {
          return { res: res, data: data || {} };
        });
    });
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

  function membrosLabel(n) {
    n = Number(n || 0);
    return n === 1 ? "1 membro" : n + " membros";
  }

  function userNode(u, opts) {
    opts = opts || {};
    var wrap = el("span", { class: "bm-user" },
      el("a", { class: "user-mention", href: "/@" + encodeURIComponent(u.username) }, ">>" + u.username)
    );
    if (opts.adm) wrap.appendChild(el("span", { class: "bm-badge bm-badge-adm", title: "ADM da base" }, "[ADM]"));
    if (u.is_primordial) {
      wrap.appendChild(el("span", { class: "bm-badge bm-badge-prim", title: "usuário primordial" },
        u.primordial_n != null ? "primordial #" + u.primordial_n : "primordial"));
    }
    return wrap;
  }

  var mePromise = null;
  function me() {
    if (!mePromise) {
      mePromise = getJson("/api/auth/me").then(function (out) {
        return out.data || {};
      }).catch(function () {
        return {};
      });
    }
    return mePromise;
  }

  /* ---------- unir-se / membro ---------- */
  function setJoin(btn, member) {
    btn.textContent = member ? "membro" : "unir-se";
    btn.setAttribute("aria-pressed", member ? "true" : "false");
    btn.classList.toggle("is-member", !!member);
    btn.title = member ? "Você é membro da base. Clique para sair." : "Unir-se à base";
  }

  function showJoinMsg(node, parts) {
    if (!node) return;
    clear(node);
    if (!parts) {
      node.hidden = true;
      return;
    }
    parts.forEach(function (p) { node.appendChild(typeof p === "string" ? document.createTextNode(p) : p); });
    node.hidden = false;
  }

  /* ---------- unir-se a cada /b/<slug> ---------- */
  function loginParts(slug) {
    return [
      "Entre na sua conta para se unir a b/" + slug + ". ",
      el("a", { href: "/entrar/" }, "Entrar"),
      " · ",
      el("a", { href: "/cadastro/" }, "Cadastrar"),
    ];
  }

  function setCount(slug, n) {
    var boxes = document.querySelectorAll('[data-community-adms="' + slug + '"] [data-members-count]');
    Array.prototype.forEach.call(boxes, function (b) { b.textContent = membrosLabel(n); });
  }

  function bindCommJoin() {
    var wrap = document.querySelector("[data-comm-join]");
    if (!wrap) return;
    var slug = wrap.getAttribute("data-comm-join");
    var btn = wrap.querySelector("[data-comm-join-btn]");
    var msg = document.querySelector("[data-comm-join-msg]");
    if (!btn || !slug) return;
    var url = "/api/comunidades/" + encodeURIComponent(slug) + "/membro";
    var state = { logado: false, membro: false };
    btn.title = "Unir-se a b/" + slug;
    getJson(url).then(function (out) {
      if (!out.res.ok) return;
      state = out.data;
      setJoin(btn, !!state.membro);
      btn.title = state.membro ? "Você é membro de b/" + slug + ". Clique para sair." : "Unir-se a b/" + slug;
      setCount(slug, state.total_membros);
    }).catch(function () {});
    btn.addEventListener("click", function () {
      if (!state.logado) {
        showJoinMsg(msg, loginParts(slug));
        return;
      }
      btn.disabled = true;
      getJson(url, { method: state.membro ? "DELETE" : "POST" })
        .then(function (out) {
          if (out.res.status === 401) {
            state.logado = false;
            showJoinMsg(msg, loginParts(slug));
            return;
          }
          if (!out.res.ok) {
            showJoinMsg(msg, [out.data.erro || "Não foi possível atualizar agora."]);
            return;
          }
          state = out.data;
          setJoin(btn, !!state.membro);
          btn.title = state.membro ? "Você é membro de b/" + slug + ". Clique para sair." : "Unir-se a b/" + slug;
          setCount(slug, state.total_membros);
          showJoinMsg(msg, state.membro
            ? ["Você agora é membro de b/" + slug + ". ", el("a", { href: "/b/membros/?b=" + slug }, "ver membros")]
            : null);
        })
        .catch(function () {
          showJoinMsg(msg, ["Falha de rede. Tente de novo."]);
        })
        .then(function () {
          btn.disabled = false;
        });
    });
  }

  /* ---------- comunidades (painel + abas + ADMs por comunidade) ---------- */
  var commsPromise = null;
  function loadComms(force) {
    if (!commsPromise || force) {
      commsPromise = getJson("/api/comunidades").then(function (out) {
        return (out.data && out.data.comunidades) || [];
      }).catch(function () {
        return [];
      });
    }
    return commsPromise;
  }

  /* ---------- MOR-39: avatar ASCII da b/ (sem avatar: o "b" laranja) ---------- */
  function avatarPre(av) {
    var pre = el("span", { class: "av-pre" });
    if (window.BDAccount && window.BDAccount.colorize) window.BDAccount.colorize(pre, av.arte, av.cores || null);
    else pre.textContent = av.arte;
    return pre;
  }
  var BOX = { b: [64, 60], md: [60, 56], xs: [44, 40], mini: [34, 30] };
  // Mesma conta de functions/_lib/b-avatar.js (fitScale): a arte ocupa o quadro, pequena ou cheia.
  function fitScale(arte, size) {
    var bx = BOX[size] || BOX.md, lines = String(arte || "").split("\n"), cols = 1;
    lines.forEach(function (l) { cols = Math.max(cols, Array.from(l).length); });
    return Math.max(0.3, Math.min(1.1, (bx[0] - 6) / (cols * 6.02), (bx[1] - 6) / (Math.max(1, lines.length) * 11))).toFixed(3);
  }
  // Ícone para listas (span, pode ficar dentro de um <a>): avatar com o quadro transparente ou o "b" laranja.
  function bIcon(slug, av, size) {
    var cls = "or-b-icon or-b-icon-" + (size || "md");
    if (!av || !av.arte) return el("span", { class: cls + " or-b-tile", "aria-hidden": "true" }, "b");
    return el("span", { class: cls + " ascii-avatar", "aria-hidden": "true", "data-b-avatar": slug, style: "--av-scale:" + fitScale(av.arte, size || "md") }, avatarPre(av));
  }
  // Cabeçalho das páginas estáticas (b/adm, b/atoa): troca o "b" pelo avatar, se houver. As outras já vêm do servidor.
  // O último avatar conhecido fica no localStorage para aparecer já na abertura (sem piscar o "b"); a lista nova corrige.
  var BAV_KEY = "bd_b_avatares";
  function setHeader(a, slug, av) {
    clear(a);
    if (av && av.arte) {
      a.className = "or-snoo or-snoo-art ascii-avatar ascii-avatar-b";
      a.setAttribute("data-b-avatar", slug);
      a.style.setProperty("--av-scale", fitScale(av.arte, "b"));
      var pre = avatarPre(av); pre.setAttribute("aria-hidden", "true");
      a.appendChild(pre);
    } else {
      a.className = "or-snoo";
      a.removeAttribute("data-b-avatar");
      a.style.removeProperty("--av-scale");
      a.appendChild(document.createTextNode("b"));
    }
  }
  function staticHeaders() {
    // Só cabeçalhos ainda sem marca do servidor (data-b-ssr) — as páginas do servidor já vêm certas.
    return Array.prototype.filter.call(document.querySelectorAll(".or-header a.or-snoo[aria-label^=\"b/\"]"), function (a) { return !a.hasAttribute("data-b-ssr"); });
  }
  function hydrateHeaders(items, fromCache) {
    var by = {};
    items.forEach(function (c) { if (c && /^[a-z0-9_-]+$/.test(c.slug)) by[c.slug] = c.avatar && c.avatar.arte ? { arte: c.avatar.arte, cores: c.avatar.cores || null } : null; });
    staticHeaders().forEach(function (a) {
      var slug = a.getAttribute("aria-label").slice(2);
      if (!(slug in by)) return;
      var av = by[slug], had = a.getAttribute("data-b-arte");
      var key = av ? av.arte + "\u0000" + (av.cores || "") : "";
      if (had === key) return;
      setHeader(a, slug, av);
      a.setAttribute("data-b-arte", key);
    });
    if (!fromCache) { try { localStorage.setItem(BAV_KEY, JSON.stringify(by)); } catch (e) {} }
  }
  function hydrateFromCache() {
    var m = null;
    try { m = JSON.parse(localStorage.getItem(BAV_KEY) || "null"); } catch (e) { m = null; }
    if (!m || typeof m !== "object") return;
    hydrateHeaders(Object.keys(m).map(function (k) { var v = m[k]; return { slug: k, avatar: v && typeof v.arte === "string" && v.arte.length <= 400 ? v : null }; }), true);
  }
  window.BDBAvatar = { icon: bIcon, pre: avatarPre, fitScale: fitScale };

  function renderPanel(host, items) {
    clear(host);
    items.forEach(function (c) {
      var n = Number(c.post_count || 0);
      var title = "b/" + c.slug + (c.name && c.name !== c.slug ? " — " + c.name : "");
      host.appendChild(
        el("a", { class: "or-sub has-icon", href: c.href || "/b/" + c.slug + "/", "data-slug": c.slug },
          bIcon(c.slug, c.avatar, "md"),
          el("div", { class: "or-sub-text" },
          el("h2", { class: "or-sub-name" }, title),
          c.description ? el("p", { class: "or-sub-desc" }, c.description) : null,
          el("p", { class: "or-sub-meta" },
            el("span", { "data-count": "" }, n === 1 ? "1 postagem" : n + " postagens"),
            " · ",
            el("span", { "data-members": "" }, membrosLabel(c.total_membros)),
            " · ",
            el("span", { "data-activity": "" }, c.last_activity ? "atividade " + relativeTime(c.last_activity) : "sem atividade recente"),
            c.adms && c.adms.length ? " · moderação: " + c.adms.map(function (a) { return ">>" + a.username; }).join(", ") : null
          ))
        )
      );
    });
  }

  function renderTabs(ul, items) {
    clear(ul);
    ul.appendChild(el("li", { class: "selected" }, el("a", { href: "/b/" }, "painel")));
    items.forEach(function (c) {
      ul.appendChild(el("li", null, el("a", { href: c.href || "/b/" + c.slug + "/" }, c.slug)));
    });
  }

  function fillAdmBoxes(items) {
    var boxes = document.querySelectorAll("[data-community-adms]");
    if (!boxes.length) return;
    var by = {};
    items.forEach(function (c) { by[c.slug] = c; });
    Array.prototype.forEach.call(boxes, function (box) {
      var c = by[box.getAttribute("data-community-adms")];
      var cnt = box.querySelector("[data-members-count]");
      if (cnt && c) cnt.textContent = membrosLabel(c.total_membros);
      var list = box.querySelector("[data-adms-list]");
      if (!list) return;
      clear(list);
      var adms = (c && c.adms) || [];
      if (!adms.length) {
        list.appendChild(document.createTextNode("nenhum ADM definido"));
        return;
      }
      adms.forEach(function (a, i) {
        if (i) list.appendChild(document.createTextNode(", "));
        list.appendChild(userNode(a));
      });
    });
  }

  function refreshComms(force) {
    return loadComms(force).then(function (items) {
      var panel = document.getElementById("bd-comunidades");
      if (panel && items.length) renderPanel(panel, items);
      var tabs = document.querySelector("[data-comm-tabs]");
      if (tabs && items.length) renderTabs(tabs, items);
      fillAdmBoxes(items);
      hydrateHeaders(items);
      return items;
    });
  }

  /* ---------- criar /b (apenas ADM do site) ---------- */
  function bindCreate() {
    var wrap = document.getElementById("base-criar");
    if (!wrap) return;
    me().then(function (info) {
      if (!info || !info.is_site_admin) return;
      wrap.hidden = false;
      var btn = document.getElementById("base-criar-btn");
      var form = document.getElementById("base-criar-form");
      var status = document.getElementById("base-criar-status");
      btn.addEventListener("click", function () {
        var open = form.hidden;
        form.hidden = !open;
        btn.textContent = open ? "[-] fechar" : "[+] criar /b";
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        if (open) form.querySelector('input[name="slug"]').focus();
      });
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var fd = new FormData(form);
        status.textContent = "Criando…";
        status.className = "bd-comments-status";
        getJson("/api/comunidades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: String(fd.get("slug") || "").trim().toLowerCase(),
            name: String(fd.get("name") || "").trim(),
            description: String(fd.get("description") || "").trim(),
          }),
        }).then(function (out) {
          if (!out.res.ok) {
            status.textContent = out.data.erro || "Não foi possível criar.";
            status.className = "bd-comments-status is-error";
            return;
          }
          var c = out.data.comunidade;
          form.reset();
          clear(status);
          status.className = "bd-comments-status is-ok";
          status.appendChild(document.createTextNode("Comunidade criada: "));
          status.appendChild(el("a", { href: c.href }, "b/" + c.slug));
          refreshComms(true);
        }).catch(function () {
          status.textContent = "Falha de rede.";
          status.className = "bd-comments-status is-error";
        });
      });
    });
  }


  /* ---------- cartões editáveis (painel /b e cada /b/<slug>) ---------- */
  var TOKEN_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]]|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|>>[A-Za-z0-9_]{3,20})/g;

  function appendInline(node, text) {
    var str = String(text || "");
    var last = 0;
    str.replace(TOKEN_RE, function (m, _g, idx) {
      if (idx > last) node.appendChild(document.createTextNode(str.slice(last, idx)));
      if (m.indexOf(">>") === 0) {
        node.appendChild(el("a", { class: "user-mention", href: "/@" + m.slice(2) }, m));
      } else if (/^https?:/i.test(m)) {
        node.appendChild(el("a", { href: m, rel: "noopener noreferrer" }, m));
      } else {
        node.appendChild(el("a", { href: "mailto:" + m }, m));
      }
      last = idx + m.length;
      return m;
    });
    if (last < str.length) node.appendChild(document.createTextNode(str.slice(last)));
  }

  function renderBody(node, text) {
    clear(node);
    String(text || "").split(/\n{2,}/).forEach(function (para) {
      para = para.trim();
      if (!para) return;
      var p = el("p");
      para.split("\n").forEach(function (line, i) {
        if (i) p.appendChild(el("br"));
        appendInline(p, line);
      });
      node.appendChild(p);
    });
  }

  function renderCard(card, data) {
    var t = card.querySelector("[data-card-title]");
    var st = card.querySelector("[data-card-subtitle]");
    var b = card.querySelector("[data-card-body]");
    if (t) t.textContent = data.title || "";
    if (st) {
      clear(st);
      appendInline(st, data.subtitle || "");
      st.hidden = !data.subtitle;
    }
    if (b) renderBody(b, data.body || "");
  }

  function bindCard(card) {
    var kind = card.getAttribute("data-card");
    var slug = card.getAttribute("data-card-slug");
    var url = kind === "panel" ? "/api/b/cartao" : "/api/comunidades/" + encodeURIComponent(slug) + "/cartao";
    var current = null;
    getJson(url).then(function (out) {
      if (!out.res.ok) return;
      current = out.data;
      renderCard(card, current);
    }).catch(function () {});
    me().then(function (info) {
      if (!info) return;
      var can = kind === "panel"
        ? !!info.is_site_admin
        : !!info.is_site_admin || (info.admin_communities || []).indexOf(slug) !== -1;
      if (!can) return;
      var btn = card.querySelector("[data-card-edit]");
      if (!btn) return;
      btn.hidden = false;
      // MOR-36: atalho para a gestão de etiquetas desta b/.
      if (kind !== "panel" && slug && btn.parentNode && !card.querySelector(".bd-card-tags-link")) {
        var tl = el("a", { class: "bd-card-tags-link", href: "/b/adm/moderar/?b=" + encodeURIComponent(slug) + "#mod-sec-etiquetas", title: "criar e editar etiquetas de b/" + slug }, "etiquetas");
        btn.parentNode.insertBefore(tl, btn.nextSibling);
        btn.parentNode.insertBefore(document.createTextNode(" · "), tl);
      }
      // MOR-38: atalho para ligar/desligar o envio de imagens e vídeos nesta b/.
      if (kind !== "panel" && slug && btn.parentNode && !card.querySelector(".bd-card-midia-link")) {
        var tagsLink = card.querySelector(".bd-card-tags-link");
        var ml = el("a", { class: "bd-card-tags-link bd-card-midia-link", href: "/b/adm/moderar/?b=" + encodeURIComponent(slug) + "#mod-sec-midia", title: "envio de imagens e vídeos em b/" + slug }, "arquivos");
        var after = tagsLink || btn;
        btn.parentNode.insertBefore(ml, after.nextSibling);
        btn.parentNode.insertBefore(document.createTextNode(" · "), ml);
      }
      // MOR-39: atalho para o avatar ASCII desta b/.
      if (kind !== "panel" && slug && btn.parentNode && !card.querySelector(".bd-card-avatar-link")) {
        var prev = card.querySelector(".bd-card-midia-link") || card.querySelector(".bd-card-tags-link") || btn;
        var al = el("a", { class: "bd-card-tags-link bd-card-avatar-link", href: "/b/adm/moderar/?b=" + encodeURIComponent(slug) + "#mod-sec-bavatar", title: "avatar ASCII de b/" + slug }, "avatar");
        btn.parentNode.insertBefore(al, prev.nextSibling);
        btn.parentNode.insertBefore(document.createTextNode(" · "), al);
      }
      var form = null;
      btn.addEventListener("click", function () {
        if (form) {
          form.remove();
          form = null;
          card.classList.remove("is-editing");
          btn.textContent = "editar";
          return;
        }
        var data = current || {
          title: (card.querySelector("[data-card-title]") || {}).textContent || "",
          subtitle: (card.querySelector("[data-card-subtitle]") || {}).textContent || "",
          body: Array.prototype.map.call(card.querySelectorAll("[data-card-body] p"), function (p) { return p.innerText; }).join("\n\n"),
        };
        var ti = el("input", { type: "text", name: "title", maxlength: "80", required: "required" });
        ti.value = data.title || "";
        var si = el("input", { type: "text", name: "subtitle", maxlength: "120" });
        si.value = data.subtitle || "";
        var bi = el("textarea", { name: "body", maxlength: "2000", rows: "6" });
        bi.value = data.body || "";
        var status = el("p", { class: "bd-comments-status", role: "status" });
        var cancel = el("button", { type: "button", class: "or-card-cancel" }, "Cancelar");
        form = el("form", { class: "or-card-form" },
          el("label", null, "Título", ti),
          el("label", null, "Subtítulo", si),
          el("label", null, "Texto", bi),
          el("p", { class: "or-card-hint" }, "Deixe uma linha em branco entre parágrafos."),
          el("div", { class: "bd-comments-actions" }, el("button", { type: "submit" }, "Salvar"), cancel, status)
        );
        cancel.addEventListener("click", function () { btn.click(); });
        form.addEventListener("submit", function (ev) {
          ev.preventDefault();
          status.textContent = "Salvando…";
          status.className = "bd-comments-status";
          getJson(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: ti.value, subtitle: si.value, body: bi.value }),
          }).then(function (out) {
            if (!out.res.ok) {
              status.textContent = out.data.erro || "Não foi possível salvar.";
              status.className = "bd-comments-status is-error";
              return;
            }
            current = out.data;
            renderCard(card, current);
            btn.click();
          }).catch(function () {
            status.textContent = "Falha de rede.";
            status.className = "bd-comments-status is-error";
          });
        });
        var head = card.querySelector(".or-card-head");
        head.parentNode.insertBefore(form, head.nextSibling);
        card.classList.add("is-editing");
        btn.textContent = "fechar";
        ti.focus();
      });
    });
  }

  function bindCards() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-card]"), bindCard);
  }

  /* ---------- página /b/membros/ ---------- */
  function renderMembros(root) {
    getJson("/api/membros").then(function (out) {
      if (!out.res.ok) {
        root.textContent = out.data.erro || "Não foi possível carregar.";
        return;
      }
      var d = out.data;
      var sBase = document.getElementById("bm-adms-base");
      var sComm = document.getElementById("bm-adms-b");
      var sMem = document.getElementById("bm-membros");
      var count = document.getElementById("bm-membros-total");
      clear(sBase);
      (d.adms_base || []).forEach(function (u) {
        sBase.appendChild(el("li", null, userNode(u, { adm: true }), u.fundador ? el("span", { class: "bm-note" }, " fundador") : null));
      });
      if (!(d.adms_base || []).length) sBase.appendChild(el("li", { class: "bm-empty" }, "Nenhum ADM."));
      clear(sComm);
      function memberList(list, emptyText) {
        var ul = el("ul", { class: "bm-list" });
        (list || []).forEach(function (u) {
          ul.appendChild(el("li", null, userNode(u), u.joined_at ? el("span", { class: "bm-when" }, " · entrou " + relativeTime(u.joined_at)) : null));
        });
        if (!(list || []).length) ul.appendChild(el("li", { class: "bm-empty" }, emptyText));
        return ul;
      }
      var comms = d.membros_comunidades || d.adms_comunidades || [];
      comms.forEach(function (c) {
        var adms = el("ul", { class: "bm-list" });
        (c.adms || []).forEach(function (u) { adms.appendChild(el("li", null, userNode(u))); });
        if (!(c.adms || []).length) adms.appendChild(el("li", { class: "bm-empty" }, "Nenhum ADM definido."));
        sComm.appendChild(el("div", { class: "bm-comm", "data-slug": c.slug },
          el("h4", null, el("a", { href: c.href }, "b/" + c.slug), " ",
            el("a", { class: "bm-focus-link", href: "/b/membros/?b=" + encodeURIComponent(c.slug) }, ">>>")),
          el("p", { class: "bm-label" }, "ADMs"), adms,
          el("p", { class: "bm-label" }, "Membros · " + membrosLabel(c.total_membros)),
          memberList(c.membros, "Nenhum membro ainda.")));
      });
      var focoSlug = (new URLSearchParams(location.search).get("b") || "").trim().toLowerCase();
      var foco = focoSlug ? comms.filter(function (c) { return c.slug === focoSlug; })[0] : null;
      var focoSec = document.getElementById("bm-foco");
      var todos = document.getElementById("bm-todos");
      if (focoSlug && focoSec) {
        focoSec.hidden = false;
        if (todos) todos.hidden = true;
        var ft = document.getElementById("bm-foco-title");
        if (!foco) {
          ft.textContent = "b/" + focoSlug + " não encontrada";
          document.getElementById("bm-foco-href").hidden = true;
        } else {
          ft.textContent = "b/" + foco.slug + (foco.name && foco.name !== foco.slug ? " — " + foco.name : "");
          document.title = "Membros de b/" + foco.slug + " — basedisso";
          document.getElementById("bm-foco-href").href = foco.href;
          var fa = document.getElementById("bm-foco-adms");
          clear(fa);
          (foco.adms || []).forEach(function (u) { fa.appendChild(el("li", null, userNode(u))); });
          if (!(foco.adms || []).length) fa.appendChild(el("li", { class: "bm-empty" }, "Nenhum ADM definido."));
          document.getElementById("bm-foco-total").textContent = membrosLabel(foco.total_membros);
          var fm = document.getElementById("bm-foco-membros");
          clear(fm);
          var ml = memberList(foco.membros, "Nenhum membro ainda. Clique em unir-se em b/" + foco.slug + ".");
          while (ml.firstChild) fm.appendChild(ml.firstChild);
        }
        var pn = document.querySelector(".or-pagename a");
        if (pn && foco) pn.textContent = ">>> b/" + foco.slug;
      }
      if (count && sMem) {
      var total = Number(d.total_membros || 0);
      count.textContent = total === 1 ? "1 membro" : total + " membros";
      clear(sMem);
      (d.membros || []).forEach(function (u) {
        sMem.appendChild(el("li", null, userNode(u), el("span", { class: "bm-when" }, " · entrou " + relativeTime(u.joined_at))));
      });
      if (!(d.membros || []).length) {
        sMem.appendChild(el("li", { class: "bm-empty" }, "Nenhum membro ainda."));
      }
      }
    }).catch(function () {
      root.textContent = "Falha de rede.";
    });
  }

  function start() {
    hydrateFromCache();
    bindCommJoin();
    bindCreate();
    bindCards();
    if (document.getElementById("bd-comunidades") || document.querySelector("[data-comm-tabs]") || document.querySelector("[data-community-adms]")) {
      refreshComms(false);
    }
    var mroot = document.getElementById("bd-membros-page");
    if (mroot) renderMembros(mroot);
  }

  window.BDBase = { refreshComms: refreshComms };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
