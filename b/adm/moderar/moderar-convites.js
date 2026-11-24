(function () {
  "use strict";
  var started = false;

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
      else if (key === "checked") node.checked = !!val;
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
  function setStatus(n, text, kind) { n.textContent = text || ""; n.className = "mod-status" + (kind ? " " + kind : ""); }
  function fmt(iso) { try { return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }); } catch (e) { return iso || ""; } }
  function brl(c) { return "R$ " + (Number(c || 0) / 100).toFixed(2).replace(".", ","); }
  function brlShort(c) { var s = brl(c); return s.slice(-3) === ",00" ? s.slice(0, -3) : s; }
  function dur(min) {
    min = Number(min || 0);
    if (min >= 1440 && min % 1440 === 0) return min / 1440 === 1 ? "24h" : min / 1440 + " dias";
    if (min % 60 === 0) return min / 60 + "h";
    return min + " min";
  }
  function clock(ms) {
    if (ms <= 0) return "0min";
    var m = Math.ceil(ms / 60000), h = Math.floor(m / 60);
    return (h ? h + "h " : "") + (m % 60) + "min";
  }
  function api(method, url, body) {
    var opts = { method: method, credentials: "same-origin", headers: { Accept: "application/json" } };
    if (body !== undefined) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
    return fetch(url, opts).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) { return { res: res, data: data }; });
    });
  }
  var KIND = { adm: "ADM", primordial: "Primordial" };
  function linkFor(code) { return location.origin + "/cadastro/?codigo=" + encodeURIComponent(code); }
  function copy(text, btn, okLabel) {
    function done() {
      if (btn._orig == null) btn._orig = btn.textContent;
      btn.textContent = okLabel;
      clearTimeout(btn._t);
      btn._t = setTimeout(function () { btn.textContent = btn._orig; }, 1600);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(function () {});
  }
  function linkBtn(code, cls) {
    var b = el("button", { type: "button", class: cls || "mod-btn secondary mod-btn-sm", "data-link": linkFor(code) }, "Copiar link");
    b.addEventListener("click", function () { copy(linkFor(code), b, "Link copiado!"); });
    return b;
  }
  function kindLabel(c) { return c.kind === "collective" ? "Caixa R$ " + c.tier_id : KIND[c.kind] || c.kind; }

  /* ---------- Códigos ---------- */
  var mcList = document.getElementById("mc-list");
  var mcListStatus = document.getElementById("mc-list-status");

  function loadCodes() {
    setStatus(mcListStatus, "Carregando códigos…");
    return api("GET", "/api/adms/convites").then(function (out) {
      if (!out.res.ok) { setStatus(mcListStatus, out.data.erro || "Falha ao listar.", "erro"); return; }
      clear(mcList);
      var list = out.data.codigos || [];
      if (!list.length) { mcList.appendChild(el("p", { class: "mod-empty" }, "Nenhum código ainda.")); setStatus(mcListStatus, ""); return; }
      list.forEach(function (c) {
        var head = el("div", { class: "mc-head" },
          el("span", { class: "mc-code" }, c.code),
          el("span", { class: "mc-kind " + c.kind }, kindLabel(c)),
          el("span", { class: "mc-st " + c.status }, c.status)
        );
        if (c.status === "ativo") {
          head.appendChild(linkBtn(c.code, "mod-btn secondary mod-btn-sm mc-linkbtn"));
          var rv = el("button", { type: "button", class: "mod-btn danger mod-btn-sm" }, "Revogar");
          rv.addEventListener("click", function () {
            if (!confirm("Revogar o código " + c.code + "? Ninguém mais poderá se cadastrar com ele.")) return;
            rv.disabled = true;
            api("POST", "/api/adms/convites/" + encodeURIComponent(c.id) + "/revogar", {}).then(function (o) {
              if (!o.res.ok) { setStatus(mcListStatus, o.data.erro || "Falha ao revogar.", "erro"); rv.disabled = false; return; }
              loadCodes();
            });
          });
          head.appendChild(rv);
        }
        var meta = [
          c.criador ? "por >>" + c.criador : (c.kind === "collective" ? "gerado pela caixa" : "por ADM (senha)"),
          "duração " + dur(c.duration_minutes),
          "criado " + fmt(c.created_at),
          (c.status === "ativo" ? "expira " : "expirou/expira ") + fmt(c.expires_at),
          c.uses_count + (c.max_uses ? "/" + c.max_uses : "") + (c.uses_count === 1 ? " uso" : " usos"),
        ];
        var item = el("div", { class: "mc-item" }, head, el("p", { class: "mc-meta" }, meta.join(" · ")));
        if (c.resgates && c.resgates.length) {
          var ul = el("ul", { class: "mc-reds" });
          c.resgates.forEach(function (r) {
            var who = window.BDAccount && r.username !== "(conta apagada)"
              ? window.BDAccount.userLink({ username: r.username, is_primordial: r.primordial_n != null, primordial_n: r.primordial_n })
              : el("span", null, ">>" + r.username + (r.primordial_n ? " #" + r.primordial_n : ""));
            ul.appendChild(el("li", null, who, el("span", { class: "mc-meta" }, "· " + fmt(r.created_at)),
              r.shared_ip_codes > 1 ? el("span", { class: "mc-flag", title: "A mesma rede (hash anônimo de IP) cadastrou contas em vários códigos" }, "mesma rede em " + r.shared_ip_codes + " códigos (" + r.shared_ip_count + " contas)") : null));
          });
          item.appendChild(ul);
        }
        mcList.appendChild(item);
      });
      setStatus(mcListStatus, list.length + (list.length === 1 ? " código." : " códigos."));
    }).catch(function () { setStatus(mcListStatus, "Falha de rede.", "erro"); });
  }

  function showResult(c) {
    var box = document.getElementById("mc-result");
    if (!box) return;
    clear(box);
    var url = linkFor(c.code);
    var cp = el("button", { type: "button", class: "mod-btn mod-btn-sm" }, "Copiar código");
    cp.addEventListener("click", function () { copy(c.code, cp, "Código copiado!"); });
    box.appendChild(el("div", { class: "mc-result-top" },
      el("span", { class: "mc-result-label" }, "Novo código · " + dur(c.duration_minutes) + (c.max_uses ? " · até " + c.max_uses + " usos" : "")),
      el("span", { class: "mc-code mc-result-code" }, c.code)));
    box.appendChild(el("p", { class: "mc-result-link" }, "Link de autocompletar: ", el("a", { href: url, target: "_blank", rel: "noopener" }, url)));
    box.appendChild(el("div", { class: "mod-actions" }, cp, linkBtn(c.code, "mod-btn secondary mod-btn-sm")));
    box.hidden = false;
  }

  var mcForm = document.getElementById("mc-form");
  if (mcForm) {
    mcForm.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var st = document.getElementById("mc-status");
      var code = document.getElementById("mc-code").value.trim();
      if (code && !/^[A-Za-z0-9]{6}$/.test(code)) { setStatus(st, "O código tem 6 caracteres: letras e/ou números.", "erro"); return; }
      api("POST", "/api/adms/convites", {
        duration_value: Number(document.getElementById("mc-dur").value),
        duration_unit: document.getElementById("mc-unit").value,
        code: code,
        max_uses: document.getElementById("mc-max").value.trim() || null,
      }).then(function (out) {
        if (!out.res.ok) { setStatus(st, out.data.erro || "Não foi possível gerar.", "erro"); return; }
        setStatus(st, "Código " + out.data.codigo.code + " criado (expira " + fmt(out.data.codigo.expires_at) + ").", "ok");
        showResult(out.data.codigo);
        document.getElementById("mc-code").value = "";
        loadCodes();
      }).catch(function () { setStatus(st, "Falha de rede.", "erro"); });
    });
    document.getElementById("mc-code").addEventListener("input", function (e) {
      var v = e.target.value.replace(/\s+/g, "").toUpperCase();
      if (v !== e.target.value) e.target.value = v;
    });
  }

  /* ---------- Caixas ---------- */
  var mxGrid = document.getElementById("mx-grid");
  var mxStatus = document.getElementById("mx-status");
  var mxContrib = document.getElementById("mx-contrib");
  var ESTADO = { aberta: "aberta", espera: "em espera", travada: "travada por ADM", pausada: "pausada" };

  function tierCard(t) {
    var box = t.caixa;
    var card = el("div", { class: "mx-card" + (t.enabled ? "" : " pausada") });
    card.appendChild(el("div", { class: "mx-top" },
      el("span", { class: "mx-valor" }, brlShort(t.goal_cents)),
      el("span", { class: "mx-dur" }, "código " + dur(t.code_duration_minutes) + " · espera " + dur(t.cooldown_minutes)),
      el("span", { class: "mx-estado " + t.estado }, ESTADO[t.estado] || t.estado)
    ));
    if (box) {
      var pct = Math.min(100, (box.raised_cents / box.goal_cents) * 100);
      card.appendChild(el("div", { class: "mx-bar" }, el("span", { style: "width:" + pct.toFixed(1) + "%" })));
      card.appendChild(el("p", { class: "mx-line" }, "Rodada #" + box.round_n + ": " + brl(box.raised_cents) + " / " + brl(box.goal_cents)));
      card.appendChild(el("p", { class: "mx-line sub" }, box.first_pix_at
        ? "1º Pix em " + fmt(box.first_pix_at) + " · próxima pode abrir a partir de " + fmt(new Date(new Date(box.first_pix_at).getTime() + t.cooldown_minutes * 60000).toISOString())
        : "Aberta em " + fmt(box.opened_at) + " · espera começa no 1º Pix"));
    } else if (t.ultima) {
      card.appendChild(el("p", { class: "mx-line" }, "Última: rodada #" + t.ultima.round_n + " (" + (t.ultima.status === "funded" ? "completa" : "fechada") + ")"));
      if (t.next_open_at) {
        var left = new Date(t.next_open_at).getTime() - Date.now();
        card.appendChild(el("p", { class: "mx-line sub" }, "1º Pix em " + fmt(t.ultima.first_pix_at) + " · " + (left > 0 ? "espera termina em " + clock(left) + " (" + fmt(t.next_open_at) + ")" : "espera concluída" + (t.auto_reopen ? "" : " · aguardando ADM"))));
      } else {
        card.appendChild(el("p", { class: "mx-line sub" }, "Sem Pix na rodada anterior · sem espera" + (t.auto_reopen ? "" : " · aguardando ADM")));
      }
    } else {
      card.appendChild(el("p", { class: "mx-line sub" }, "Nenhuma rodada ainda."));
    }
    card.appendChild(el("p", { class: "mx-line sub" }, "Saldo transferido para a próxima rodada: " + brl(t.carryover_cents)));
    (t.codigos_ativos || []).forEach(function (c) {
      card.appendChild(el("p", { class: "mx-line" }, "Código ativo: ", el("span", { class: "mx-code" }, c.code), " · expira em " + clock(new Date(c.expires_at).getTime() - Date.now()) + " · " + c.uses_count + " uso(s)"));
    });

    var en = el("input", { type: "checkbox", checked: t.enabled });
    var ar = el("input", { type: "checkbox", checked: t.auto_reopen });
    var enLbl = el("span", null, t.enabled ? "Ativa (visível e recebendo Pix)" : "Pausada (oculta do público)");
    var arLbl = el("span", null, t.auto_reopen ? "Reabertura automática" : "Travada por ADM (não reabre sozinha)");
    en.addEventListener("change", function () { patch(t.id, { enabled: en.checked }); });
    ar.addEventListener("change", function () { patch(t.id, { auto_reopen: ar.checked }); });
    card.appendChild(el("div", { class: "mx-toggles" },
      el("label", { class: "mx-toggle" }, en, enLbl),
      el("label", { class: "mx-toggle" }, ar, arLbl)
    ));
    var actions = el("div", { class: "mod-actions" });
    if (box) {
      var fechar = el("button", { type: "button", class: "mod-btn secondary mod-btn-sm" }, "Fechar caixa atual");
      fechar.addEventListener("click", function () {
        if (!confirm("Fechar a rodada #" + box.round_n + " da caixa " + brlShort(t.goal_cents) + "? O valor já arrecadado passa para a próxima rodada.")) return;
        action("POST", "/api/adms/caixas/" + t.id + "/fechar", "Caixa fechada.");
      });
      actions.appendChild(fechar);
    } else {
      var abrir = el("button", { type: "button", class: "mod-btn mod-btn-sm" }, "Abrir nova caixa agora");
      abrir.addEventListener("click", function () { action("POST", "/api/adms/caixas/" + t.id + "/abrir", "Nova caixa aberta."); });
      actions.appendChild(abrir);
    }
    card.appendChild(actions);
    return card;
  }

  function patch(id, body) { action("PATCH", "/api/adms/caixas/" + id, "Classe atualizada.", body); }
  function action(method, url, okMsg, body) {
    setStatus(mxStatus, "Salvando…");
    api(method, url, body || {}).then(function (out) {
      if (!out.res.ok) { setStatus(mxStatus, out.data.erro || "Falha.", "erro"); loadBoxes(); return; }
      setStatus(mxStatus, okMsg, "ok");
      loadBoxes();
      loadCodes();
    }).catch(function () { setStatus(mxStatus, "Falha de rede.", "erro"); });
  }

  function renderContrib(list) {
    clear(mxContrib);
    if (!list.length) { mxContrib.appendChild(el("p", { class: "mod-empty" }, "Nenhuma contribuição ainda.")); return; }
    var tb = el("tbody");
    list.forEach(function (c) {
      var act = null;
      if (c.status !== "paid") {
        act = el("button", { type: "button", class: "mod-btn mod-btn-sm" }, "Confirmar pagamento");
        act.addEventListener("click", function () {
          if (!confirm("Confirmar manualmente a contribuição de " + brl(c.amount_cents) + "? Use só se o Pix caiu e o site não confirmou.")) return;
          action("POST", "/api/adms/caixas/contribuicoes/" + encodeURIComponent(c.id) + "/confirmar", "Contribuição confirmada.");
        });
      }
      tb.appendChild(el("tr", null,
        el("td", null, fmt(c.created_at)),
        el("td", null, "R$ " + c.tier_id + (c.round_n ? " · #" + c.round_n : "")),
        el("td", null, brl(c.amount_cents)),
        el("td", null, c.email || "—"),
        el("td", null, el("span", { class: "mx-st " + c.status }, { paid: "pago", pending: "pendente", expired: "expirado", failed: "falhou" }[c.status] || c.status), c.manual ? " (manual)" : null, c.paid_at ? el("div", { class: "mc-meta" }, fmt(c.paid_at)) : null),
        el("td", null, act)
      ));
    });
    mxContrib.appendChild(el("table", { class: "mx-table" },
      el("thead", null, el("tr", null, el("th", null, "Quando"), el("th", null, "Caixa"), el("th", null, "Valor"), el("th", null, "E-mail"), el("th", null, "Status"), el("th", null, ""))),
      tb));
  }

  function loadBoxes() {
    return api("GET", "/api/adms/caixas").then(function (out) {
      if (!out.res.ok) { setStatus(mxStatus, out.data.erro || "Falha ao carregar caixas.", "erro"); return; }
      clear(mxGrid);
      (out.data.caixas || []).forEach(function (t) { mxGrid.appendChild(tierCard(t)); });
      renderContrib(out.data.contribuicoes || []);
    }).catch(function () { setStatus(mxStatus, "Falha de rede.", "erro"); });
  }

  window.BDModConvites = {
    init: function () {
      if (started) return;
      started = true;
      loadCodes();
      loadBoxes();
      setInterval(function () { if (!document.hidden) loadBoxes(); }, 60000);
    },
    reload: function () { loadCodes(); loadBoxes(); },
  };
})();
