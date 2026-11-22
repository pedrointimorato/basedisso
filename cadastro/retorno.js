(function () {
  "use strict";

  var status = document.getElementById("retorno-status");
  var lead = document.getElementById("retorno-lead");
  var details = document.getElementById("retorno-detalhes");
  var form = document.getElementById("claim-pw-form");
  var linkBox = document.getElementById("claim-link-box");
  var claimLink = document.getElementById("claim-link");
  var params = new URLSearchParams(location.search);
  var rid = params.get("rid") || "";
  var token = params.get("t") || "";
  var preferenceId = params.get("preference_id") || "";
  var timer = null;
  var current = null;

  function setMsg(node, text, kind) {
    node.textContent = text || "";
    node.className = "auth-status" + (kind ? " " + kind : "");
  }

  function el(tag, attrs) {
    return window.BDAccount ? window.BDAccount.el.apply(null, arguments) : document.createElement(tag);
  }

  function showDetails(res) {
    while (details.firstChild) details.removeChild(details.firstChild);
    if (!res) return;
    var p = document.createElement("p");
    p.className = "retorno-nome";
    p.appendChild(document.createTextNode("Nome: "));
    var strong = document.createElement("strong");
    strong.textContent = ">>" + res.username;
    p.appendChild(strong);
    if (res.primordial_n != null) {
      p.appendChild(document.createTextNode(" · primordial #" + res.primordial_n));
    }
    details.appendChild(p);
  }

  function showClaimLink(url) {
    if (!url) {
      linkBox.hidden = true;
      return;
    }
    var abs = new URL(url, location.origin).href;
    claimLink.href = abs;
    claimLink.textContent = abs;
    linkBox.hidden = false;
  }

  function apply(data) {
    current = data && data.reserva;
    if (!current) {
      setMsg(status, (data && data.erro) || "Reserva não encontrada.", "erro");
      return;
    }
    showDetails(current);
    var st = current.status;
    if (st === "paid") {
      setMsg(status, "Pagamento confirmado. Defina uma senha para criar a conta >>" + current.username + ".", "ok");
      lead.textContent = "A reserva foi paga. Crie a senha e entre no basedisso com o seu nome primordial.";
      form.hidden = false;
      showClaimLink(data.sua ? current.claim_url : null);
      if (timer) clearInterval(timer);
      return;
    }
    if (st === "claimed") {
      setMsg(status, "Esta reserva já foi reivindicada. Entre com a sua senha.", "ok");
      form.hidden = true;
      linkBox.hidden = true;
      if (timer) clearInterval(timer);
      return;
    }
    if (st === "expired") {
      setMsg(status, "A reserva expirou antes do pagamento. Você pode tentar de novo em /cadastro.", "erro");
      form.hidden = true;
      linkBox.hidden = true;
      if (timer) clearInterval(timer);
      return;
    }
    setMsg(status, "Aguardando a confirmação do pagamento… isso pode levar alguns instantes.", "");
    form.hidden = true;
    showClaimLink(null);
  }

  function poll() {
    var q = new URLSearchParams();
    if (rid) q.set("rid", rid);
    if (token) q.set("t", token);
    if (preferenceId) q.set("preference_id", preferenceId);
    fetch("/api/reservas/minha?" + q.toString(), {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    })
      .then(function (res) {
        return res.json().then(function (data) { return { res: res, data: data }; });
      })
      .then(function (out) {
        if (!out.res.ok) {
          setMsg(status, out.data && out.data.erro ? out.data.erro : "Não foi possível consultar a reserva.", "erro");
          return;
        }
        apply(out.data);
      })
      .catch(function () {
        setMsg(status, "Falha de rede ao consultar a reserva.", "erro");
      });
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var pw = document.getElementById("claim-pw").value;
    var pw2 = document.getElementById("claim-pw2").value;
    var st = document.getElementById("claim-pw-status");
    setMsg(st, "");
    if (pw !== pw2) {
      setMsg(st, "As senhas não coincidem.", "erro");
      return;
    }
    var btn = form.querySelector(".auth-submit");
    btn.disabled = true;
    fetch("/api/reservas/claim", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        password: pw,
        token: token || undefined,
        rid: (current && current.id) || rid || undefined,
      }),
    })
      .then(function (res) {
        return res.json().then(function (data) { return { res: res, data: data }; });
      })
      .then(function (out) {
        if (!out.res.ok) {
          setMsg(st, out.data && out.data.erro ? out.data.erro : "Não foi possível criar a conta.", "erro");
          return;
        }
        var name = out.data.usuario && out.data.usuario.username;
        location.href = name ? "/@" + name : "/";
      })
      .catch(function () { setMsg(st, "Falha de rede. Tente de novo.", "erro"); })
      .then(function () { btn.disabled = false; });
  });

  document.getElementById("copy-claim-link").addEventListener("click", function () {
    var href = claimLink.href;
    if (navigator.clipboard && href) {
      navigator.clipboard.writeText(href).then(function () {
        document.getElementById("copy-claim-link").textContent = "Link copiado";
      }).catch(function () {});
    }
  });

  poll();
  timer = setInterval(poll, 2500);
})();
