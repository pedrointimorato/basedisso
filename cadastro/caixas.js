(function () {
  "use strict";

  var grid = document.getElementById("caixas-grid");
  if (!grid) return;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var cards = {};
  var serverSkew = 0;

  function el(tag, attrs) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    for (var key in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, key)) continue;
      var val = attrs[key];
      if (val == null) continue;
      if (key === "class") node.className = val;
      else if (key.slice(0, 2) === "on" && typeof val === "function") node.addEventListener(key.slice(2).toLowerCase(), val);
      else if (key === "disabled") node.disabled = !!val;
      else node.setAttribute(key, val);
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      node.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
    }
    return node;
  }

  function brl(cents) {
    var v = (Number(cents || 0) / 100).toFixed(2).split(".");
    return "R$ " + v[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + v[1];
  }
  function brlShort(cents) {
    var s = brl(cents);
    return s.slice(-3) === ",00" ? s.slice(0, -3) : s;
  }
  function durLabel(min) {
    min = Number(min || 0);
    if (min % 1440 === 0 && min >= 1440) return (min / 1440 === 1 ? "24h" : min / 1440 + " dias");
    if (min % 60 === 0) return min / 60 + "h";
    if (min > 60) return Math.floor(min / 60) + "h" + (min % 60) + "min";
    return min + " min";
  }
  function now() { return Date.now() + serverSkew; }
  function clock(ms) {
    if (ms <= 0) return "00:00:00";
    var t = Math.floor(ms / 1000);
    var h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }
  function humanLeft(ms) {
    if (ms <= 0) return "instantes";
    var min = Math.ceil(ms / 60000);
    var h = Math.floor(min / 60), m = min % 60;
    if (h > 0) return h + "h " + m + "min";
    return m + " min";
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  function linkFor(code) { return location.origin + "/cadastro/?codigo=" + encodeURIComponent(code); }
  function copy(text, btn, okLabel) {
    function done() {
      if (btn._orig == null) btn._orig = btn.textContent;
      btn.textContent = okLabel || "Copiado";
      clearTimeout(btn._t);
      btn._t = setTimeout(function () { btn.textContent = btn._orig; }, 1600);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(function () {});
    else {
      var ta = el("textarea", { readonly: "readonly" }); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  function usarCodigo(code) {
    if (window.BDCadastro && window.BDCadastro.usarCodigo) window.BDCadastro.usarCodigo(code);
    else location.href = "/cadastro/?codigo=" + encodeURIComponent(code);
  }

  function buildCard(t) {
    var c = { tier: t };
    c.root = el("article", { class: "caixa-item", "data-tier": t.id });
    c.rodada = el("span", { class: "caixa-rodada" });
    c.root.appendChild(el("div", { class: "caixa-head" },
      el("span", { class: "caixa-valor" }, brlShort(t.goal_cents)),
      el("span", { class: "caixa-dur" }, "código de " + durLabel(t.code_duration_minutes)),
      el("span", { class: "caixa-espera" }, "· espera " + durLabel(t.cooldown_minutes)),
      c.rodada
    ));
    c.dyn = el("div", { class: "caixa-dyn" });
    c.root.appendChild(c.dyn);
    c.contrib = buildContrib(c);
    c.root.appendChild(c.contrib);
    return c;
  }

  function buildContrib(c) {
    var det = el("details", { class: "caixa-contrib" });
    det.appendChild(el("summary", null, "Contribuir via Pix"));
    var body = el("div", { class: "caixa-contrib-body" });
    var chosen = 100;
    var quick = el("div", { class: "caixa-quick", role: "group", "aria-label": "Valor" });
    var outro = el("input", { type: "text", class: "caixa-outro", inputmode: "decimal", placeholder: "outro valor", "aria-label": "Outro valor em reais" });
    var btns = [];
    [100, 200, 500].forEach(function (v) {
      var b = el("button", { type: "button", class: "caixa-btn" + (v === chosen ? " ativo" : "") }, brlShort(v));
      b.addEventListener("click", function () {
        chosen = v; outro.value = "";
        btns.forEach(function (x) { x.classList.remove("ativo"); });
        b.classList.add("ativo");
      });
      btns.push(b);
      quick.appendChild(b);
    });
    outro.addEventListener("input", function () { if (outro.value.trim()) btns.forEach(function (x) { x.classList.remove("ativo"); }); });
    quick.appendChild(outro);
    body.appendChild(quick);
    var emailId = "caixa-email-" + c.tier.id;
    var email = el("input", { type: "email", id: emailId, autocomplete: "email", placeholder: "seu@email.com" });
    var main = document.getElementById("reserva-email");
    body.appendChild(el("label", { for: emailId }, "E-mail (para o Pix)"));
    body.appendChild(email);
    var st = el("p", { class: "caixa-pix-status", role: "status" });
    var gerar = el("button", { type: "button", class: "auth-submit" }, "Gerar Pix");
    body.appendChild(gerar);
    body.appendChild(st);
    var pixArea = el("div", { class: "caixa-pix pix-box", hidden: "hidden" });
    body.appendChild(pixArea);
    det.appendChild(body);
    det.addEventListener("toggle", function () {
      if (det.open && !email.value && main && main.value) email.value = main.value;
    });

    gerar.addEventListener("click", function () {
      var cents = chosen;
      if (outro.value.trim()) {
        var n = Number(outro.value.trim().replace(/^R\$\s*/i, "").replace(/\./g, "").replace(",", "."));
        if (!isFinite(n)) { st.textContent = "Valor inválido."; st.className = "caixa-pix-status erro"; return; }
        cents = Math.round(n * 100);
      }
      if (!(cents >= (c.tier.min_contribution_cents || 100))) { st.textContent = "A contribuição mínima é R$ 1,00."; st.className = "caixa-pix-status erro"; return; }
      if (cents > 100000) { st.textContent = "O valor máximo por contribuição é R$ 1.000,00."; st.className = "caixa-pix-status erro"; return; }
      if (!EMAIL_RE.test(email.value.trim())) { st.textContent = "Informe um e-mail válido para o Pix."; st.className = "caixa-pix-status erro"; email.focus(); return; }
      gerar.disabled = true;
      st.textContent = "Gerando Pix…"; st.className = "caixa-pix-status";
      fetch("/api/caixas/" + encodeURIComponent(c.tier.id) + "/contribuir", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ amount_cents: cents, email: email.value.trim() }),
      })
        .then(function (res) { return res.json().then(function (d) { return { res: res, data: d }; }); })
        .then(function (out) {
          if (!out.res.ok) {
            st.textContent = (out.data && out.data.erro) || "Não foi possível gerar o Pix.";
            st.className = "caixa-pix-status erro";
            return;
          }
          st.textContent = "";
          showPix(c, pixArea, out.data);
        })
        .catch(function () { st.textContent = "Falha de rede. Tente de novo."; st.className = "caixa-pix-status erro"; })
        .then(function () { gerar.disabled = false; });
    });
    return det;
  }

  function showPix(c, area, data) {
    clear(area);
    area.hidden = false;
    var pix = data.pix || {};
    var contrib = data.contribuicao || {};
    var timer = el("p", { class: "pix-timer" });
    area.appendChild(el("p", { class: "pix-nome" }, "Contribuição de " + brl(contrib.amount_cents) + " · caixa " + brlShort(c.tier.goal_cents)));
    area.appendChild(timer);
    if (pix.qr_code_base64) area.appendChild(el("img", { class: "pix-qr", alt: "QR Code Pix", src: pix.qr_code_base64 }));
    var ta = el("textarea", { readonly: "readonly", rows: "3", "aria-label": "Pix copia e cola" });
    ta.value = pix.qr_code || "";
    area.appendChild(ta);
    var cp = el("button", { type: "button", class: "caixa-btn primario" }, "Copiar código Pix");
    cp.addEventListener("click", function () { copy(ta.value, cp); });
    area.appendChild(el("div", { class: "caixa-codigo-acoes" }, cp));
    var st = el("p", { class: "caixa-pix-status", role: "status" }, "Aguardando o pagamento… a caixa atualiza sozinha.");
    area.appendChild(st);
    var exp = new Date(pix.expires_at || contrib.expires_at).getTime();
    if (c.pixTick) clearInterval(c.pixTick);
    if (c.pixPoll) clearInterval(c.pixPoll);
    function tick() {
      var left = exp - Date.now();
      timer.textContent = left > 0 ? "Pix expira em " + clock(left).slice(3) : "O Pix expirou. Gere outro se quiser contribuir.";
      if (left <= 0) clearInterval(c.pixTick);
    }
    tick();
    c.pixTick = setInterval(tick, 1000);
    function poll() {
      fetch("/api/caixas/contribuicoes/" + encodeURIComponent(contrib.id) + "/status", { credentials: "same-origin", headers: { Accept: "application/json" } })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d || !d.ok) return;
          if (d.status === "paid") {
            clearInterval(c.pixPoll);
            clearInterval(c.pixTick);
            st.className = "caixa-pix-status ok";
            st.textContent = d.box_funded && d.generated_code
              ? "Pagamento confirmado! A caixa completou e gerou o código " + d.generated_code.code + "."
              : "Pagamento confirmado! Obrigado por contribuir.";
            timer.textContent = "";
            load();
          } else if (d.status === "failed") {
            clearInterval(c.pixPoll);
            st.className = "caixa-pix-status erro";
            st.textContent = "O pagamento não foi aprovado.";
          }
        })
        .catch(function () {});
    }
    c.pixPoll = setInterval(poll, 5000);
  }

  function renderDyn(c, t) {
    c.tier = t;
    clear(c.dyn);
    var box = t.caixa;
    c.rodada.textContent = box ? "rodada #" + box.round_n : (t.ultima ? "rodada #" + t.ultima.round_n : "");
    var raised = box ? box.raised_cents : (t.ultima && t.ultima.status === "funded" ? t.goal_cents : 0);
    var goal = box ? box.goal_cents : t.goal_cents;
    var pct = Math.max(0, Math.min(100, goal ? (raised / goal) * 100 : 0));
    var bar = el("div", { class: "caixa-bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(goal), "aria-valuenow": String(raised) }, el("span", { style: "width:" + pct.toFixed(1) + "%" }));
    c.dyn.appendChild(bar);
    c.dyn.appendChild(el("p", { class: "caixa-nums" }, el("strong", null, brl(raised)), " / " + brl(goal), box ? null : " · completa"));

    (t.codigos_ativos || []).forEach(function (code) {
      var timerNode = el("span", { class: "caixa-codigo-timer", "data-expira": code.expires_at });
      var cp = el("button", { type: "button", class: "caixa-btn" }, "Copiar");
      cp.addEventListener("click", function () { copy(code.code, cp); });
      var usar = el("button", { type: "button", class: "caixa-btn primario" }, "Usar este código");
      usar.addEventListener("click", function () { usarCodigo(code.code); });
      var cpl = el("button", { type: "button", class: "caixa-btn", "data-link": linkFor(code.code) }, "Copiar link");
      cpl.addEventListener("click", function () { copy(linkFor(code.code), cpl, "Link copiado!"); });
      c.dyn.appendChild(el("div", { class: "caixa-codigo" },
        el("div", { class: "caixa-codigo-top" },
          el("span", { class: "caixa-codigo-label" }, "Código ativo" + (code.round_n ? " · rodada #" + code.round_n : "")),
          timerNode
        ),
        el("div", { class: "caixa-codigo-valor" }, code.code),
        el("div", { class: "caixa-codigo-acoes" }, cp, cpl, usar)
      ));
    });

    if (t.estado === "espera" && t.next_open_at) {
      c.dyn.appendChild(el("p", { class: "caixa-status", "data-abre": t.next_open_at, title: "A espera conta a partir do 1º Pix confirmado da caixa anterior." }, "Próxima caixa abre em " + humanLeft(new Date(t.next_open_at).getTime() - now())));
      c.dyn.appendChild(el("p", { class: "caixa-recentes" }, "A espera começou no 1º Pix da rodada anterior."));
    } else if (t.estado === "travada") {
      c.dyn.appendChild(el("p", { class: "caixa-status travada" }, "Aguardando liberação dos ADMs"));
    }
    var recent = (t.rodadas_recentes || []).filter(function (r) { return r.status === "funded"; });
    if (recent.length) {
      c.dyn.appendChild(el("p", { class: "caixa-recentes" }, recent.length === 1 ? "1 rodada completa recentemente." : recent.length + " rodadas completas recentemente."));
    }
    c.contrib.hidden = !box;
    if (!box) c.contrib.open = false;
  }

  function tickAll() {
    var nodes = grid.querySelectorAll("[data-expira]");
    var expired = false;
    for (var i = 0; i < nodes.length; i++) {
      var left = new Date(nodes[i].getAttribute("data-expira")).getTime() - now();
      nodes[i].textContent = left > 0 ? "expira em " + clock(left) : "expirado";
      if (left <= 0) expired = true;
    }
    var abre = grid.querySelectorAll("[data-abre]");
    for (var j = 0; j < abre.length; j++) {
      var l2 = new Date(abre[j].getAttribute("data-abre")).getTime() - now();
      abre[j].textContent = l2 > 0 ? "Próxima caixa abre em " + humanLeft(l2) : "Abrindo a próxima caixa…";
      if (l2 <= 0) expired = true;
    }
    if (expired && !tickAll.pending) {
      tickAll.pending = true;
      setTimeout(function () { tickAll.pending = false; load(); }, 3000);
    }
  }

  function load() {
    return fetch("/api/caixas", { credentials: "same-origin", headers: { Accept: "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.ok) throw new Error("x");
        if (data.agora) serverSkew = new Date(data.agora).getTime() - Date.now();
        var list = data.caixas || [];
        var seen = {};
        if (!list.length) {
          clear(grid);
          cards = {};
          grid.appendChild(el("p", { class: "caixas-vazio" }, "Nenhuma caixa aberta no momento."));
          return;
        }
        var empty = grid.querySelector(".caixas-vazio");
        if (empty) grid.removeChild(empty);
        list.forEach(function (t, idx) {
          seen[t.id] = true;
          var c = cards[t.id];
          if (!c) { c = cards[t.id] = buildCard(t); }
          if (grid.children[idx] !== c.root) grid.insertBefore(c.root, grid.children[idx] || null);
          renderDyn(c, t);
        });
        Object.keys(cards).forEach(function (id) {
          if (!seen[id]) { if (cards[id].root.parentNode) grid.removeChild(cards[id].root); delete cards[id]; }
        });
        tickAll();
      })
      .catch(function () {
        if (!Object.keys(cards).length) { clear(grid); grid.appendChild(el("p", { class: "caixas-vazio" }, "Não foi possível carregar as caixas agora.")); }
      });
  }

  load().then(function () {
    if (location.hash === "#caixas") {
      var sec = document.getElementById("caixas");
      if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
  setInterval(tickAll, 1000);
  setInterval(function () { if (!document.hidden) load(); }, 30000);
})();
