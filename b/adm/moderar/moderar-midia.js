// MOR-38 — moderação: aba "Arquivos". Liga/desliga o envio de imagens e vídeos por contas em cada b/ que o ADM gere.
(function () {
  "use strict";
  var list = document.getElementById("mod-midia-list");
  var status = document.getElementById("mod-midia-status");
  if (!list) return;
  function el(tag, attrs) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) if (attrs[k] != null && attrs[k] !== false) { if (k === "class") n.className = attrs[k]; else n.setAttribute(k, attrs[k]); }
    for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c == null || c === false) continue; n.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c); }
    return n;
  }
  function st(node, t, k) { node.textContent = t || ""; node.className = "mod-status" + (k ? " " + k : ""); }
  var foco = "";
  try { foco = (new URLSearchParams(location.search).get("b") || "").toLowerCase(); } catch (e) {}
  function row(c) {
    var cb = el("input", { type: "checkbox", class: "mod-midia-cb", "data-b": c.slug });
    cb.checked = Boolean(c.ativo);
    var msg = el("span", { class: "mod-midia-msg", role: "status" });
    var estado = el("span", { class: "mod-midia-estado" + (c.ativo ? " is-on" : "") }, c.ativo ? "ligado" : "desligado");
    cb.addEventListener("change", function () {
      var want = cb.checked;
      cb.disabled = true;
      msg.textContent = "salvando…"; msg.className = "mod-midia-msg";
      fetch("/api/moderation/midia", { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ b: c.slug, ativo: want }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { r: r, d: d }; }); })
        .then(function (o) {
          cb.disabled = false;
          if (!o.r.ok) { cb.checked = !want; msg.textContent = o.d.erro || "não foi possível salvar"; msg.className = "mod-midia-msg erro"; return; }
          c.ativo = want;
          estado.textContent = want ? "ligado" : "desligado";
          estado.classList.toggle("is-on", want);
          msg.textContent = "salvo"; msg.className = "mod-midia-msg ok";
        })
        .catch(function () { cb.disabled = false; cb.checked = !want; msg.textContent = "falha de rede"; msg.className = "mod-midia-msg erro"; });
    });
    return el("li", { class: "mod-midia-item" + (foco === c.slug ? " is-foco" : ""), id: "mod-midia-b-" + c.slug },
      el("label", { class: "mod-midia-label" }, cb, " ", el("strong", null, "b/" + c.slug), " — contas podem enviar imagens e vídeos"),
      " ", estado, " ", msg);
  }
  function load() {
    st(status, "carregando…");
    fetch("/api/moderation/midia", { credentials: "same-origin", headers: { Accept: "application/json" } })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { r: r, d: d }; }); })
      .then(function (o) {
        while (list.firstChild) list.removeChild(list.firstChild);
        if (!o.r.ok) { st(status, o.r.status === 401 || o.r.status === 403 ? "" : o.d.erro || "Não foi possível carregar.", o.r.status === 401 || o.r.status === 403 ? "" : "erro"); return; }
        var cs = o.d.comunidades || [];
        var on = cs.filter(function (c) { return c.ativo; }).length;
        st(status, cs.length ? on + " de " + cs.length + (cs.length === 1 ? " b/ com envio ligado" : " b/ com envio ligado") : "Nenhuma b/ para gerir.");
        cs.forEach(function (c) { list.appendChild(row(c)); });
        if (o.d.site) list.appendChild(el("li", { class: "mod-midia-note" }, "Como ADM do site, você pode enviar arquivos em qualquer b/ e nos comentários de qualquer página, mesmo com o envio desligado."));
        else list.appendChild(el("li", { class: "mod-midia-note" }, "Como ADM, você sempre pode enviar arquivos na sua b/, mesmo com o envio desligado."));
      })
      .catch(function () { st(status, "Falha de rede.", "erro"); });
  }
  document.addEventListener("bd-mod-ready", load);
  load();
})();
