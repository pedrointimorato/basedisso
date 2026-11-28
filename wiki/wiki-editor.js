/* Edição da wiki (MOR-46): editor com prévia, salvar, reverter, ocultar/apagar e editores autorizados.
   A permissão de verdade é conferida no servidor; este script só cuida da tela. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function api(method, url, body) {
    return fetch(url, {
      method: method,
      credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { d.__status = r.status; return d; });
    }).catch(function () { return { erro: "Sem conexão. Tente de novo.", __status: 0 }; });
  }
  function status(msg, ok) {
    var el = $("#wiki-status");
    if (!el) return;
    el.textContent = msg || "";
    el.className = "wiki-status" + (msg ? (ok ? " ok" : " erro") : "");
  }

  // ---- editor ----
  var form = $("#wiki-form");
  if (form) {
    var modo = form.getAttribute("data-modo");
    var slug = form.getAttribute("data-slug");
    var base = form.getAttribute("data-base");
    var corpo = $("#wiki-corpo");
    var previa = $("#wiki-previa");
    var salvando = false;
    var sujo = false;
    var salvo = false;
    form.addEventListener("input", function () { sujo = true; if (previa) previa.setAttribute("data-velha", "1"); });
    window.addEventListener("beforeunload", function (e) {
      if (sujo && !salvo) { e.preventDefault(); e.returnValue = ""; }
    });

    var abas = $$("[data-wiki-aba]", form);
    function aba(qual) {
      abas.forEach(function (b) {
        var on = b.getAttribute("data-wiki-aba") === qual;
        b.classList.toggle("ativa", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
      var ver = qual === "ver";
      corpo.hidden = ver;
      previa.hidden = !ver;
      if (ver) carregarPrevia();
    }
    abas.forEach(function (b) { b.addEventListener("click", function () { aba(b.getAttribute("data-wiki-aba")); }); });

    var pedido = 0;
    function carregarPrevia() {
      var n = ++pedido;
      previa.innerHTML = '<p class="wiki-vazio">Carregando a prévia…</p>';
      api("POST", "/api/wiki/preview", { corpo: corpo.value }).then(function (d) {
        if (n !== pedido) return;
        if (d.html != null) { previa.innerHTML = d.html; previa.removeAttribute("data-velha"); }
        else { previa.textContent = d.erro || "Não foi possível gerar a prévia."; }
      });
    }

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (salvando) return;
      var f = form.elements;
      var dados = {
        titulo: f.titulo.value,
        nav: f.nav.value,
        resumo: f.resumo.value,
        corpo: f.corpo.value,
        resumo_edicao: f.resumo_edicao.value,
      };
      if (f.grupo) dados.grupo = f.grupo.value;
      if (f.ordem) dados.ordem = f.ordem.value;
      var url, method;
      if (modo === "nova") { dados.slug = f.slug.value; url = "/api/wiki/paginas"; method = "POST"; }
      else { dados.base_rev = base; url = "/api/wiki/paginas/" + encodeURIComponent(slug); method = "PUT"; }
      salvando = true;
      var btn = $("#wiki-salvar");
      btn.disabled = true;
      status("Salvando…", true);
      api(method, url, dados).then(function (d) {
        salvando = false;
        btn.disabled = false;
        if (d.ok) {
          salvo = true;
          status(modo === "nova" ? "Página criada." : "Salvo.", true);
          window.location.href = d.url || "/wiki/";
          return;
        }
        if (d.__status === 409 && d.conflito) {
          status(d.erro || "Conflito de edição.", false);
          var a = $("#wiki-status");
          if (a && slug) {
            var l = document.createElement("a");
            l.href = "/wiki/" + (slug) + "/editar/";
            l.textContent = " Abrir a versão atual";
            l.target = "_blank";
            l.rel = "noopener";
            a.appendChild(l);
          }
          return;
        }
        status(d.erro || "Não foi possível salvar.", false);
      });
    });
  }

  // ---- ações por clique (reverter, ocultar, apagar, revogar) ----
  document.addEventListener("click", function (ev) {
    var t = ev.target.closest ? ev.target.closest("[data-wiki-reverter],[data-wiki-ocultar],[data-wiki-apagar],[data-wiki-revogar]") : null;
    if (!t) return;
    ev.preventDefault();
    var slug = t.getAttribute("data-slug");
    if (t.hasAttribute("data-wiki-reverter")) {
      if (!window.confirm("Reverter a página para esta versão? Isso cria uma nova versão e mantém o histórico.")) return;
      t.disabled = true;
      api("POST", "/api/wiki/paginas/" + encodeURIComponent(slug) + "/reverter", { rev: t.getAttribute("data-wiki-reverter") }).then(function (d) {
        if (d.ok) { window.location.href = d.url || "/wiki/"; return; }
        t.disabled = false;
        status(d.erro || "Não foi possível reverter.", false);
      });
    } else if (t.hasAttribute("data-wiki-ocultar")) {
      var ocultar = t.getAttribute("data-wiki-ocultar") === "1";
      if (ocultar && !window.confirm("Ocultar esta página? Só ADMs e editores continuarão a vê-la.")) return;
      t.disabled = true;
      api("POST", "/api/wiki/paginas/" + encodeURIComponent(slug) + "/ocultar", { oculta: ocultar }).then(function (d) {
        if (d.ok) { window.location.reload(); return; }
        t.disabled = false;
        window.alert(d.erro || "Não foi possível mudar a página.");
      });
    } else if (t.hasAttribute("data-wiki-apagar")) {
      if (!window.confirm("Apagar esta página e todo o histórico dela? Não dá para desfazer.")) return;
      t.disabled = true;
      api("DELETE", "/api/wiki/paginas/" + encodeURIComponent(slug)).then(function (d) {
        if (d.ok) { window.location.href = "/wiki/"; return; }
        t.disabled = false;
        window.alert(d.erro || "Não foi possível apagar.");
      });
    } else if (t.hasAttribute("data-wiki-revogar")) {
      var nome = t.getAttribute("data-wiki-revogar");
      if (!window.confirm("Tirar de " + nome + " a permissão de editar a wiki?")) return;
      t.disabled = true;
      api("DELETE", "/api/wiki/editores/" + encodeURIComponent(nome)).then(function (d) {
        if (d.ok) { removerItem(nome); status("Autorização de " + nome + " retirada.", true); return; }
        t.disabled = false;
        status(d.erro || "Não foi possível revogar.", false);
      });
    }
  });

  // ---- editores autorizados ----
  var lista = $("#wiki-editores-lista");
  function removerItem(nome) {
    $$("li[data-editor]", lista).forEach(function (li) { if (li.getAttribute("data-editor") === nome) li.remove(); });
    if (!lista.querySelector("li[data-editor]") && !lista.querySelector("[data-vazio]")) {
      var li = document.createElement("li");
      li.className = "wiki-vazio";
      li.setAttribute("data-vazio", "");
      li.textContent = "Nenhuma conta autorizada além dos ADMs.";
      lista.appendChild(li);
    }
  }
  function adicionarItem(nome) {
    var vazio = lista.querySelector("[data-vazio]");
    if (vazio) vazio.remove();
    var li = document.createElement("li");
    li.setAttribute("data-editor", nome);
    var a = document.createElement("span");
    a.className = "wiki-editor-nome";
    var link = document.createElement("a");
    link.href = "/@" + encodeURIComponent(nome);
    link.textContent = ">>" + nome;
    a.appendChild(link);
    var info = document.createElement("span");
    info.className = "wiki-editor-info";
    info.textContent = "autorizado agora";
    var b = document.createElement("button");
    b.type = "button";
    b.className = "wiki-btn perigo";
    b.setAttribute("data-wiki-revogar", nome);
    b.textContent = "Revogar";
    li.appendChild(a); li.appendChild(info); li.appendChild(b);
    lista.insertBefore(li, lista.firstChild);
  }
  var fe = $("#wiki-editores-form");
  if (fe) {
    fe.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var campo = fe.elements.usuario;
      var btn = fe.querySelector("button[type=submit]");
      btn.disabled = true;
      api("POST", "/api/wiki/editores", { usuario: campo.value }).then(function (d) {
        btn.disabled = false;
        if (d.ok) { adicionarItem(d.username); campo.value = ""; status(d.username + " agora pode editar a wiki.", true); return; }
        status(d.erro || "Não foi possível autorizar.", false);
      });
    });
  }
})();
