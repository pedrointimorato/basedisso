(function () {
  "use strict";

  var form = document.getElementById("reserva-form");
  var status = document.getElementById("reserva-status");
  var disp = document.getElementById("reserva-disponivel");
  var userInput = document.getElementById("reserva-username");
  var btn = document.getElementById("reserva-btn");
  var aberto = false;
  var timer = null;

  function setMsg(node, text, kind) {
    node.textContent = text || "";
    node.className = "auth-status" + (kind ? " " + kind : "");
  }

  function applyAberto(flag) {
    aberto = !!flag;
    if (!aberto) {
      btn.disabled = true;
      btn.textContent = "Reservas abrem em breve";
    } else {
      btn.disabled = false;
      btn.textContent = "Reservar por R$ 5";
    }
  }

  fetch("/api/reservas/info", { credentials: "same-origin", headers: { Accept: "application/json" } })
    .then(function (res) { return res.json(); })
    .then(function (data) { applyAberto(data && data.aberto); })
    .catch(function () { applyAberto(false); });

  fetch("/api/auth/cadastro-info", { credentials: "same-origin", headers: { Accept: "application/json" } })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      var box = document.getElementById("claim-box");
      if (data && data.can_claim_intimorato && box) box.hidden = false;
    })
    .catch(function () {});

  function checkName() {
    var nome = userInput.value.trim();
    if (nome.length < 3) {
      setMsg(disp, "");
      return;
    }
    fetch("/api/reservas/disponivel?nome=" + encodeURIComponent(nome), {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.disponivel) setMsg(disp, ">>" + data.username + " está disponível.", "ok");
        else setMsg(disp, (data && data.erro) || "Este nome não está disponível.", "erro");
      })
      .catch(function () { setMsg(disp, ""); });
  }

  userInput.addEventListener("input", function () {
    clearTimeout(timer);
    timer = setTimeout(checkName, 350);
  });

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    setMsg(status, "");
    if (!aberto) {
      setMsg(status, "Reservas abrem em breve.", "erro");
      return;
    }
    btn.disabled = true;
    fetch("/api/reservas", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        username: userInput.value,
        email: document.getElementById("reserva-email").value,
        website: form.website.value,
      }),
    })
      .then(function (res) {
        return res.json().then(function (data) { return { res: res, data: data }; });
      })
      .then(function (out) {
        if (!out.res.ok) {
          setMsg(status, out.data && out.data.erro ? out.data.erro : "Não foi possível reservar.", "erro");
          return;
        }
        if (out.data.checkout_url) {
          setMsg(status, "Abrindo o Mercado Pago…", "ok");
          location.href = out.data.checkout_url;
          return;
        }
        setMsg(status, "Reserva criada, mas o pagamento não iniciou.", "erro");
      })
      .catch(function () {
        setMsg(status, "Falha de rede. Tente de novo.", "erro");
      })
      .then(function () {
        if (aberto) btn.disabled = false;
      });
  });

  var claimForm = document.getElementById("claim-form");
  if (claimForm) {
    claimForm.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var st = document.getElementById("claim-status");
      var pw = document.getElementById("claim-password").value;
      var pw2 = document.getElementById("claim-password2").value;
      setMsg(st, "");
      if (pw !== pw2) {
        setMsg(st, "As senhas não coincidem.", "erro");
        return;
      }
      var cbtn = document.getElementById("claim-btn");
      cbtn.disabled = true;
      fetch("/api/auth/signup", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ username: "Intimorato", password: pw }),
      })
        .then(function (res) {
          return res.json().then(function (data) { return { res: res, data: data }; });
        })
        .then(function (out) {
          if (!out.res.ok) {
            setMsg(st, out.data && out.data.erro ? out.data.erro : "Não foi possível reivindicar.", "erro");
            return;
          }
          location.href = "/@Intimorato";
        })
        .catch(function () { setMsg(st, "Falha de rede. Tente de novo.", "erro"); })
        .then(function () { cbtn.disabled = false; });
    });
  }
})();
