// Enquete na página da postagem: estado ao vivo, voto e resultado em barras ASCII (espelha functions/_lib/enquete-html.js).
(function () {
  "use strict";
  function el(tag, attrs) {
    var n = document.createElement(tag), k;
    attrs = attrs || {};
    for (k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k) || attrs[k] == null || attrs[k] === false) continue;
      if (k === "class") n.className = attrs[k];
      else n.setAttribute(k, attrs[k] === true ? "" : attrs[k]);
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return n;
  }
  function votosTxt(n) { return n === 1 ? "1 voto" : n + " votos"; }
  function bar(pct) { var w = 20, f = Math.max(0, Math.min(w, Math.round((pct / 100) * w))); return new Array(f + 1).join("█") + new Array(w - f + 1).join("░"); }
  function prazoTexto(iso) {
    var ms = Date.parse(iso) - Date.now();
    if (!(ms > 0)) return "encerrada";
    var min = Math.floor(ms / 60000), d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60;
    if (d > 0) return "encerra em " + d + "d " + h + "h";
    if (h > 0) return "encerra em " + h + "h " + m + "min";
    return "encerra em " + Math.max(1, m) + "min";
  }
  function timeNode(iso) { return el("time", { datetime: iso, "data-hora-local": true }, iso); }

  function render(box, poll) {
    while (box.firstChild) box.removeChild(box.firstChild);
    var encerrada = poll.encerrada || Date.parse(poll.encerra_em) <= Date.now();
    var prazo = encerrada
      ? el("span", { class: "bd-poll-prazo" }, "encerrada em ", timeNode(poll.encerra_em))
      : el("span", { class: "bd-poll-prazo" }, prazoTexto(poll.encerra_em) + " ", el("span", { class: "bd-poll-quando" }, "(", timeNode(poll.encerra_em), ")"));
    box.appendChild(el("p", { class: "bd-poll-head" }, el("span", { class: "bd-poll-tag" }, "[enquete]"), " ", el("span", { class: "bd-poll-total" }, votosTxt(poll.total)), " · ", prazo));
    if (poll.mostra_resultado) {
      var max = 0;
      poll.opcoes.forEach(function (o) { if ((o.votos || 0) > max) max = o.votos || 0; });
      var ol = el("ol", { class: "bd-poll-results" });
      poll.opcoes.forEach(function (o) {
        var pct = poll.total ? Math.round(((o.votos || 0) / poll.total) * 100) : 0;
        var cls = "bd-poll-res" + (o.id === poll.meu_voto ? " is-mine" : "") + (poll.total && o.votos === max ? " is-top" : "");
        ol.appendChild(el("li", { class: cls },
          el("span", { class: "bd-poll-label" }, o.label, o.id === poll.meu_voto ? el("span", { class: "bd-poll-mine" }, " ✓ seu voto") : null),
          el("span", { class: "bd-poll-barline" }, el("span", { class: "bd-poll-bar", "aria-hidden": "true" }, bar(pct)), " ", el("span", { class: "bd-poll-pct" }, pct + "%"), " ", el("span", { class: "bd-poll-n" }, "(" + (o.votos || 0) + ")"))
        ));
      });
      box.appendChild(ol);
    } else {
      var fs = el("fieldset", { disabled: !poll.pode_votar || encerrada }, el("legend", { class: "bd-sr" }, "Escolha uma opção"));
      poll.opcoes.forEach(function (o) {
        fs.appendChild(el("label", { class: "bd-poll-opt" }, el("input", { type: "radio", name: "opcao", value: o.id }), " ", el("span", null, o.label)));
      });
      fs.appendChild(el("button", { type: "submit", class: "bd-poll-votar" }, "Votar"));
      var form = el("form", { class: "bd-poll-form", "data-enquete-form": true }, fs);
      form.addEventListener("submit", function (ev) { ev.preventDefault(); vote(box, form); });
      box.appendChild(form);
    }
    var notes = [];
    if (poll.motivo && poll.motivo.motivo !== "encerrada") {
      if (poll.motivo.motivo === "entrar") {
        var p = el("p", { class: "bd-poll-note" }, el("a", { href: "/entrar/?next=" + encodeURIComponent(location.pathname) }, "Entre na sua conta"), " para votar.");
        notes.push(p);
      } else notes.push(el("p", { class: "bd-poll-note" }, poll.motivo.texto));
    }
    if (poll.previa === "autor") notes.push(el("p", { class: "bd-poll-note" }, "Prévia: você é o autor; o resultado aparece para os outros depois que votam ou quando encerrar."));
    else if (poll.previa === "adm") notes.push(el("p", { class: "bd-poll-note" }, "Prévia de ADM: o resultado aparece para os outros depois que votam ou quando encerrar."));
    if (!poll.mostra_resultado) notes.push(el("p", { class: "bd-poll-note" }, "O resultado aparece depois que você vota ou quando a enquete encerrar."));
    notes.forEach(function (n) { box.appendChild(n); });
    box.appendChild(el("p", { class: "bd-poll-status", role: "status", "data-enquete-status": true }));
    if (window.BDHoraLocal) window.BDHoraLocal.apply(box);
    box._poll = poll;
  }

  function status(box, text, isErr) {
    var s = box.querySelector("[data-enquete-status]");
    if (!s) return;
    s.textContent = text || "";
    s.className = "bd-poll-status" + (isErr ? " erro" : "");
  }

  function vote(box, form) {
    var sel = form.querySelector('input[name="opcao"]:checked');
    if (!sel) { status(box, "Escolha uma opção.", true); return; }
    var btn = form.querySelector("button");
    if (btn) btn.disabled = true;
    fetch("/api/enquetes/" + encodeURIComponent(box.getAttribute("data-enquete")) + "/votar", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ opcao: sel.value }),
    })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { r: r, d: d }; }); })
      .then(function (o) {
        if (o.r.ok && o.d.enquete) { render(box, o.d.enquete); status(box, "Voto registrado."); return; }
        if (btn) btn.disabled = false;
        status(box, (o.d && o.d.erro) || "Não foi possível votar.", true);
        if (o.r.status === 409) load(box);
      })
      .catch(function () { if (btn) btn.disabled = false; status(box, "Falha de rede.", true); });
  }

  function load(box) {
    return fetch("/api/enquetes/" + encodeURIComponent(box.getAttribute("data-enquete")), { credentials: "same-origin", headers: { Accept: "application/json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.enquete) render(box, d.enquete); })
      .catch(function () {});
  }

  function init() {
    var boxes = document.querySelectorAll("[data-enquete]");
    for (var i = 0; i < boxes.length; i++) load(boxes[i]);
    // Atualiza o "encerra em" a cada minuto (e vira "encerrada" sozinho).
    setInterval(function () {
      for (var j = 0; j < boxes.length; j++) {
        var b = boxes[j];
        if (!b._poll) continue;
        if (!b._poll.encerrada && Date.parse(b._poll.encerra_em) <= Date.now()) load(b);
        else if (!b._poll.encerrada) { var pz = b.querySelector(".bd-poll-prazo"); if (pz && pz.firstChild && pz.firstChild.nodeType === 3) pz.firstChild.textContent = prazoTexto(b._poll.encerra_em) + " "; }
      }
    }, 60000);
  }
  window.BDEnquete = { render: render, load: load };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
