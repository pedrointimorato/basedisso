(function () {
  "use strict";

  var PAGE_LABELS = {
    "/adm": { href: "/b/adm/", label: "b/adm" },
    "/b/adm": { href: "/b/adm/", label: "b/adm" },
    "/l": { href: "/l/", label: "literatura da comunidade" },
    "/s": { href: "/l/", label: "literatura da comunidade" },
    "/l/biblia-amarela": { href: "/l/biblia-amarela.html", label: "A Bíblia Amarela" },
    "/s/biblia-amarela": { href: "/l/biblia-amarela.html", label: "A Bíblia Amarela" },
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

  // ---------- Arte ASCII: regras e editor compartilhados em /ascii-editor.js ----------
  var autoOpened = false;
  var AU = window.BDAsciiEditor.util;
  var ASCII_LINES = AU.ASCII_LINES, ASCII_COLS = AU.ASCII_COLS, AVATAR_LINES = AU.AVATAR_LINES, AVATAR_COLS = AU.AVATAR_COLS;
  var asciiBlock = AU.asciiBlock, dimBlock = AU.dimBlock, cleanAscii = AU.cleanAscii, cpLen = AU.cpLen;
  var LAYERS_MAX = window.BDAsciiEditor.LAYERS_MAX;

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
    var alvoQs = data.perfil_alvo ? "?perfil=" + encodeURIComponent(data.perfil_alvo) : "";
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
      // Camadas de baixo para cima; artes antigas chegam como uma camada só (igual à arte).
      var srvLayers = data[kind === "arte" ? "ascii_camadas" : "avatar_camadas"];
      var startLayers = srvLayers && srvLayers.length ? srvLayers : existing ? [{ arte: existing.arte, cores: existing.cores, visivel: true }] : null;
      var curFrame = art ? art.moldura : "simples";
      var ed = null;
      function radio(value, label) {
        var input = el("input", { type: "radio", name: "ascii-moldura", value: value, id: "ascii-moldura-" + value });
        input.checked = curFrame === value;
        input.addEventListener("change", function () { if (input.checked) { curFrame = value; ed.update(); } });
        return el("label", { class: "ascii-radio", for: "ascii-moldura-" + value }, input, " " + label);
      }
      var frames = K.frames ? el("fieldset", { class: "ascii-frames" }, el("legend", null, "Moldura"),
        radio("simples", "Moldura simples"), radio("nenhuma", "Sem moldura")) : null;
      var save = el("button", { type: "button", class: "ascii-btn", id: K.prefix + "-salvar" }, "Salvar");
      var cancel = el("button", { type: "button", class: "ascii-btn secondary", id: K.prefix + "-cancelar" }, "Cancelar");
      var remove = existing ? el("button", { type: "button", class: "ascii-btn danger", id: K.prefix + "-remover" }, K.removeLabel) : null;
      var hint = kind === "avatar"
        ? el("p", { class: "ascii-hint" }, "Um desenho pequeno, como uma foto de perfil: aparece aqui no topo e ao lado do seu nome em comentários e postagens. Até 8 linhas × 16 colunas; emojis não.")
        : el("p", { class: "ascii-hint" }, "Texto puro, fonte monoespaçada. Espaços são mantidos; tabulações viram 4 espaços. Caracteres de caixa como ", el("code", null, "┌─┐│└┘╔═╗"), " são permitidos; emojis não.");
      var toolLink = el("p", { class: "ascii-hint ascii-tool-link" }, "Quer mais espaço, desfazer ou exportar? Use a ",
        el("a", { href: "/f/arte.html", id: K.prefix + "-ferramenta-link" }, "ferramenta de arte ASCII"), " e mande de lá para o perfil.");
      ed = window.BDAsciiEditor.create({
        prefix: K.prefix, title: K.title, lines: K.lines, cols: K.cols, rows: K.rows, kind: kind,
        layers: startLayers, hint: el("div", null, hint, toolLink), extras: [frames],
        previewLabel: kind === "avatar" ? "Pré-visualização (perfil e comentários)" : "Pré-visualização (largura de celular)",
        previewWrapClass: kind === "avatar" ? "avatar-preview-sizes" : "ascii-preview-phone",
        renderPreview: function (preview, sc, info) {
          if (kind === "avatar") {
            if (info.dim) preview.appendChild(el("div", { class: "avatar-preview-item avatar-preview-camadas" }, dimBlock(sc, info.active, "nenhuma", false), el("span", null, "camadas")));
            preview.appendChild(el("div", { class: "avatar-preview-item" }, avatarPreview(sc.arte, "lg", sc.cores), el("span", null, "perfil")));
            preview.appendChild(el("div", { class: "avatar-preview-item" },
              el("div", { class: "avatar-preview-comment" }, avatarPreview(sc.arte, "sm", sc.cores),
                el("div", null, el("p", { class: "bd-comment-meta" }, el("strong", null, ">>" + u.username), " · agora"), el("p", { class: "avatar-preview-body" }, "um comentário qualquer"))),
              el("span", null, "comentários")));
          } else if (info.dim) {
            preview.appendChild(dimBlock(sc, info.active, curFrame, true));
          } else {
            preview.appendChild(asciiBlock(sc.arte, curFrame, "Pré-visualização", sc.cores));
          }
        },
        onUpdate: function (api) { save.disabled = api.state().erros.length > 0; },
      });
      ed.node.appendChild(el("div", { class: "ascii-actions" }, save, remove, cancel));
      editorHost.appendChild(ed.node);
      save.disabled = ed.state().erros.length > 0;
      ed.focus();
      cancel.addEventListener("click", function () { reload(""); });
      save.addEventListener("click", function () {
        ed.update();
        if (ed.state().erros.length) return;
        save.disabled = true;
        setSt(status, "Salvando…");
        var camadas = ed.layersData();
        var body = K.frames ? { camadas: camadas, moldura: curFrame } : { camadas: camadas };
        api("PUT", K.api + alvoQs, body).then(function (out) {
          if (out.res.ok) reload(K.savedMsg);
          else { save.disabled = false; setSt(status, (out.data && out.data.erro) || "Não foi possível salvar.", "erro"); }
        }).catch(function () { save.disabled = false; setSt(status, "Falha de rede.", "erro"); });
      });
      if (remove) remove.addEventListener("click", function () {
        if (!confirm(alvoQs ? "Remover " + (K.frames ? "a arte ASCII" : "o avatar") + " do perfil >>anônimo?" : K.confirmOwn)) return;
        remove.disabled = true;
        api("DELETE", K.api + alvoQs).then(function (out) {
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
    if (data.anonimo) {
      renderAnon(root, headText, data, reload, flash);
      return;
    }
    var meta = "No basedisso desde " + relativeTime(u.created_at);
    if (u.is_admin) meta += " · administrador";
    else if (data.adm_de && data.adm_de.length) meta += " · ADM de " + data.adm_de.map(function (s) { return "b/" + s; }).join(", ");
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

  // Perfil coletivo >>anônimo: postagens e comentários publicados como >>anônimo, 30 por página.
  function renderAnon(root, headText, data, reload, flash) {
    headText.appendChild(el("p", { class: "profile-meta" }, "Perfil coletivo: tudo o que foi publicado como >>anônimo (por quem marcou a caixinha ou postou sem conta e sem nome)."));
    if (data.pode_editar_ascii) headText.appendChild(el("p", { class: "profile-meta profile-anon-adm" }, "Você é ADM do site: pode editar a arte e o avatar deste perfil coletivo."));
    if (data.ultima_edicao) {
      var ue = data.ultima_edicao;
      var line = el("p", { class: "profile-meta profile-anon-log", id: "perfil-anon-log" }, "Última edição (visível só para ADMs): ");
      line.appendChild(ue.por && window.BDAccount ? window.BDAccount.userLink(ue.por) : document.createTextNode("[conta removida]"));
      line.appendChild(document.createTextNode((ue.o_que ? " · " + ue.o_que : "") + " · " + (ue.em ? new Date(ue.em).toLocaleString("pt-BR") : "")));
      headText.appendChild(line);
    }
    var asciiSec = renderAsciiSection(root, data, reload, flash);
    if (asciiSec) {
      root.appendChild(asciiSec);
      if (flash) setSt(asciiSec.querySelector(".ascii-status"), flash, "ok");
    }
    var items = data.contribuicoes || [];
    var pagina = data.pagina || 1;
    root.appendChild(el("h2", { class: "bd-comments-title" }, items.length ? "Contribuições" + (pagina > 1 ? " — página " + pagina : "") : (pagina > 1 ? "Nada nesta página." : "Ainda sem contribuições.")));
    if (items.length) {
      var list = el("ul", { class: "profile-comments profile-anon-list" });
      items.forEach(function (c) {
        var meta = el("p", { class: "profile-comment-page" });
        if (c.tipo === "postagem") {
          meta.appendChild(el("span", { class: "profile-anon-kind" }, "postagem em "));
          meta.appendChild(el("a", { href: "/b/" + c.community + "/" }, "b/" + c.community));
        } else {
          meta.appendChild(el("span", { class: "profile-anon-kind" }, "comentário em "));
          meta.appendChild(pageLink(c.page));
        }
        meta.appendChild(document.createTextNode(" · " + (c.created_at ? new Date(c.created_at).toLocaleString("pt-BR") : "")));
        if (c.usuario && c.usuario.is_admin && window.BDAccount) {
          meta.appendChild(document.createTextNode(" "));
          meta.appendChild(el("span", { class: "user-badge", title: "administrador" }, "[M]"));
        } else if (c.usuario && c.usuario.b_admin) {
          meta.appendChild(document.createTextNode(" "));
          meta.appendChild(el("span", { class: "user-badge user-badge-b", title: "ADM de b/" + c.usuario.b_admin }, "[b]"));
        }
        if (window.BDAccount && window.BDAccount.appendAnonExtras) window.BDAccount.appendAnonExtras(meta, Object.assign({ anonimo: true }, c));
        var title = c.tipo === "postagem" ? el("p", { class: "profile-anon-title" }, el("a", { href: c.page }, c.title || "(sem título)")) : null;
        var body = null;
        if (c.body) {
          body = el("p", { class: "profile-comment-body" });
          window.BDAccount.appendBodyWithMentions(body, c.body, c.mencoes || {});
        }
        list.appendChild(el("li", { "data-anon-id": c.id, "data-anon-tipo": c.tipo }, meta, title, body,
          (function () { var box = el("div"); window.BDAccount.img && window.BDAccount.img.append(box, c.body || ""); return box.firstChild || null; })()));
      });
      root.appendChild(list);
    }
    if (pagina > 1 || data.mais) {
      var nav = el("p", { class: "profile-anon-pager" });
      if (pagina > 1) nav.appendChild(el("a", { href: "/@anônimo" + (pagina > 2 ? "?pagina=" + (pagina - 1) : ""), rel: "prev" }, "← mais recentes"));
      if (pagina > 1 && data.mais) nav.appendChild(document.createTextNode(" · "));
      if (data.mais) nav.appendChild(el("a", { href: "/@anônimo?pagina=" + (pagina + 1), rel: "next" }, "mais antigas →"));
      root.appendChild(nav);
    }
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
    var pg = (location.search.match(/[?&]pagina=(\d+)/) || [])[1];
    fetch("/api/users/" + encodeURIComponent(name) + (pg ? "?pagina=" + pg : ""), { headers: { Accept: "application/json" }, credentials: "same-origin" })
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
