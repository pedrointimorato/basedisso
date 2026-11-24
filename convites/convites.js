(function () {
  "use strict";
  var root = document.getElementById("convites-root");
  var admCard = document.getElementById("convites-adm");
  var tickers = [];

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
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function clock(ms) {
    if (ms <= 0) return "00:00:00";
    var t = Math.floor(ms / 1000);
    var h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }
  function fmt(iso) { try { return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }); } catch (e) { return iso; } }
  function durLabel(min) {
    min = Number(min || 0);
    if (min % 1440 === 0) return min / 1440 + (min === 1440 ? " dia" : " dias");
    if (min % 60 === 0) return min / 60 + "h";
    return min + " min";
  }
  var ST = { ativo: "ativo", expirado: "expirado", revogado: "revogado", esgotado: "esgotado" };

  function copy(text, btn) {
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () {
      var o = btn.textContent; btn.textContent = "Copiado"; setTimeout(function () { btn.textContent = o; }, 1500);
    }).catch(function () {});
  }

  function codeBox(code, label) {
    var timer = el("span", { class: "caixa-codigo-timer", "data-expira": code.expires_at });
    var cp = el("button", { type: "button", class: "caixa-btn" }, "Copiar");
    cp.addEventListener("click", function () { copy(code.code, cp); });
    var link = el("button", { type: "button", class: "caixa-btn" }, "Copiar link");
    link.addEventListener("click", function () { copy(location.origin + "/cadastro/?codigo=" + code.code, link); });
    return el("div", { class: "caixa-codigo convite-ativo" },
      el("div", { class: "caixa-codigo-top" }, el("span", { class: "caixa-codigo-label" }, label || "Seu código ativo"), timer),
      el("div", { class: "caixa-codigo-valor" }, code.code),
      el("p", { class: "caixa-recentes" }, "Expira " + fmt(code.expires_at) + " · " + code.uses_count + (code.uses_count === 1 ? " uso" : " usos") + (code.max_uses ? " de " + code.max_uses : "")),
      el("div", { class: "caixa-codigo-acoes" }, cp, link)
    );
  }

  function history(list) {
    if (!list.length) return null;
    var ul = el("ul", { class: "convite-hist" });
    list.forEach(function (c) {
      ul.appendChild(el("li", null,
        el("span", { class: "ch-code" }, c.code),
        el("span", { class: "ch-st " + c.status }, ST[c.status] || c.status),
        el("span", { class: "ch-meta" }, (c.kind === "adm" ? "ADM · " + durLabel(c.duration_minutes) : "primordial · 24h") + " · criado " + fmt(c.created_at) + " · " + c.uses_count + (c.uses_count === 1 ? " uso" : " usos"))
      ));
    });
    return ul;
  }

  function tick() {
    var nodes = document.querySelectorAll("[data-expira]");
    for (var i = 0; i < nodes.length; i++) {
      var left = new Date(nodes[i].getAttribute("data-expira")).getTime() - Date.now();
      nodes[i].textContent = left > 0 ? "expira em " + clock(left) : "expirado";
    }
    var w = document.querySelectorAll("[data-proximo]");
    for (var j = 0; j < w.length; j++) {
      var l2 = new Date(w[j].getAttribute("data-proximo")).getTime() - Date.now();
      if (l2 <= 0) { load(); return; }
      var d = Math.floor(l2 / 86400000);
      w[j].textContent = "Próximo código disponível em " + (d > 0 ? d + "d " : "") + clock(l2 % 86400000) + " (espera de 72h).";
    }
  }

  function render(data) {
    clear(root);
    var paid = data.pode_gerar_primordial;
    if (paid) {
      if (data.ativo) root.appendChild(codeBox(data.ativo));
      if (data.proximo_disponivel_em) {
        root.appendChild(el("p", { class: "convite-espera", "data-proximo": data.proximo_disponivel_em }, ""));
      } else {
        var st = el("p", { class: "auth-status", role: "status" });
        var btn = el("button", { type: "button", class: "auth-submit" }, "Gerar código de convite (dura 24h)");
        btn.addEventListener("click", function () {
          btn.disabled = true;
          fetch("/api/convites/gerar", { method: "POST", credentials: "same-origin", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: "{}" })
            .then(function (r) { return r.json().then(function (d) { return { res: r, data: d }; }); })
            .then(function (out) {
              if (!out.res.ok) { st.textContent = (out.data && out.data.erro) || "Não foi possível gerar."; st.className = "auth-status erro"; btn.disabled = false; return; }
              load();
            })
            .catch(function () { st.textContent = "Falha de rede."; st.className = "auth-status erro"; btn.disabled = false; });
        });
        root.appendChild(btn);
        root.appendChild(st);
      }
    } else {
      root.appendChild(el("p", { class: "convite-nota" },
        data.is_site_admin
          ? "Como ADM do site, use o gerador de código de ADM abaixo (a geração de 24h/72h é exclusiva dos primordiais que pagaram a inscrição individual)."
          : "Apenas usuários primordiais que pagaram a inscrição individual podem gerar códigos de convite. Sua conta" +
            (data.usuario && data.usuario.is_primordial ? " é primordial #" + data.usuario.primordial_n + ", mas entrou por código" : " ainda não é de primordial pagante") + "."));
    }
    var own = (data.historico || []).filter(function (c) { return c.kind === "primordial" || data.is_site_admin; });
    var h = history(own);
    if (h) {
      root.appendChild(el("h3", { class: "convites-h3" }, "Seus códigos"));
      root.appendChild(h);
    }
    if (admCard) admCard.hidden = !data.is_site_admin;
    tick();
  }

  function load() {
    return fetch("/api/convites/meus", { credentials: "same-origin", headers: { Accept: "application/json" } })
      .then(function (r) { return r.json().then(function (d) { return { res: r, data: d }; }); })
      .then(function (out) {
        if (out.res.status === 401) {
          clear(root);
          root.appendChild(el("p", { class: "convite-nota" }, "Entre na sua conta para ver ou gerar códigos de convite. ",
            el("a", { href: "/entrar" }, "Entrar"), " · ", el("a", { href: "/cadastro" }, "Cadastrar")));
          return;
        }
        if (!out.res.ok) { clear(root); root.appendChild(el("p", { class: "auth-status erro" }, (out.data && out.data.erro) || "Falha ao carregar.")); return; }
        render(out.data);
      })
      .catch(function () { clear(root); root.appendChild(el("p", { class: "auth-status erro" }, "Falha de rede.")); });
  }

  var form = document.getElementById("adm-code-form");
  if (form) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var st = document.getElementById("adm-code-status");
      var custom = document.getElementById("adm-code-custom").value.trim();
      if (custom && !/^[A-Za-z0-9]{6}$/.test(custom)) { st.textContent = "O código tem 6 caracteres: letras e/ou números."; st.className = "auth-status erro"; return; }
      var body = {
        duration_value: Number(document.getElementById("adm-dur-valor").value),
        duration_unit: document.getElementById("adm-dur-unidade").value,
        code: custom,
        max_uses: document.getElementById("adm-code-max").value.trim() || null,
      };
      st.textContent = "Gerando…"; st.className = "auth-status";
      fetch("/api/adms/convites", { method: "POST", credentials: "same-origin", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(body) })
        .then(function (r) { return r.json().then(function (d) { return { res: r, data: d }; }); })
        .then(function (out) {
          if (!out.res.ok) { st.textContent = (out.data && out.data.erro) || "Não foi possível gerar."; st.className = "auth-status erro"; return; }
          st.textContent = "Código criado."; st.className = "auth-status ok";
          var res = document.getElementById("adm-code-result");
          clear(res);
          res.appendChild(codeBox(out.data.codigo, "Código de ADM · " + durLabel(out.data.codigo.duration_minutes)));
          document.getElementById("adm-code-custom").value = "";
          load();
        })
        .catch(function () { st.textContent = "Falha de rede."; st.className = "auth-status erro"; });
    });
    document.getElementById("adm-code-custom").addEventListener("input", function (e) {
      var v = e.target.value.replace(/\s+/g, "").toUpperCase();
      if (v !== e.target.value) e.target.value = v;
    });
  }

  load();
  setInterval(tick, 1000);
})();
