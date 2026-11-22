(function () {
  "use strict";

  var form = document.getElementById("reserva-form");
  var status = document.getElementById("reserva-status");
  var disp = document.getElementById("reserva-disponivel");
  var userInput = document.getElementById("reserva-username");
  var emailInput = document.getElementById("reserva-email");
  var btn = document.getElementById("reserva-btn");
  var cardBtn = document.getElementById("reserva-card-btn");
  var pixBox = document.getElementById("pix-box");
  var aberto = false;
  var timer = null;
  var pollTimer = null;
  var countdownTimer = null;
  var currentReserva = null;
  var USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

  function setMsg(node, text, kind) {
    node.textContent = text || "";
    node.className = "auth-status" + (kind ? " " + kind : "");
  }

  function applyAberto(flag) {
    aberto = !!flag;
    if (!aberto) {
      btn.disabled = true;
      btn.textContent = "Reservas abrem em breve";
      if (cardBtn) cardBtn.disabled = true;
    } else {
      btn.disabled = false;
      btn.textContent = "Pagar com Pix · R$ 5";
      if (cardBtn) cardBtn.disabled = false;
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

  function formatRemain(ms) {
    if (ms <= 0) return "00:00";
    var total = Math.floor(ms / 1000);
    var m = Math.floor(total / 60);
    var s = total % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  function startCountdown(expiresAt) {
    var node = document.getElementById("pix-timer");
    if (countdownTimer) clearInterval(countdownTimer);
    function tick() {
      var left = new Date(expiresAt).getTime() - Date.now();
      if (left <= 0) {
        node.textContent = "O Pix expirou. Você pode tentar de novo.";
        clearInterval(countdownTimer);
        if (pollTimer) clearInterval(pollTimer);
        return;
      }
      node.textContent = "Expira em " + formatRemain(left);
    }
    tick();
    countdownTimer = setInterval(tick, 1000);
  }

  function goToClaim(reserva) {
    if (pollTimer) clearInterval(pollTimer);
    if (countdownTimer) clearInterval(countdownTimer);
    var url = (reserva && reserva.claim_url) || (reserva && reserva.id ? "/cadastro/retorno?rid=" + encodeURIComponent(reserva.id) : "/cadastro/retorno");
    location.href = url;
  }

  function pollStatus(id) {
    fetch("/api/reservas/status?id=" + encodeURIComponent(id), {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    })
      .then(function (res) { return res.json().then(function (data) { return { res: res, data: data }; }); })
      .then(function (out) {
        var reserva = out.data && out.data.reserva;
        var stNode = document.getElementById("pix-status");
        if (!out.res.ok || !reserva) return;
        if (reserva.status === "paid") {
          setMsg(stNode, "Pagamento confirmado. Abrindo a criação da conta…", "ok");
          goToClaim(reserva);
          return;
        }
        if (reserva.status === "expired") {
          setMsg(stNode, "A reserva expirou antes do pagamento.", "erro");
          if (pollTimer) clearInterval(pollTimer);
          if (countdownTimer) clearInterval(countdownTimer);
        }
      })
      .catch(function () {});
  }

  function showPix(data) {
    var reserva = data.reserva || {};
    var pix = data.pix || {};
    currentReserva = reserva;
    form.hidden = true;
    pixBox.hidden = false;
    document.getElementById("pix-nome").textContent = "Nome reservado: >>" + (reserva.username || "");
    var img = document.getElementById("pix-qr");
    if (pix.qr_code_base64) {
      img.src = pix.qr_code_base64;
      img.hidden = false;
    } else {
      img.removeAttribute("src");
      img.hidden = true;
    }
    document.getElementById("pix-copia").value = pix.qr_code || "";
    setMsg(document.getElementById("pix-status"), "Aguardando o pagamento… o Pix é confirmado automaticamente.", "");
    startCountdown(pix.expires_at || reserva.expires_at);
    if (pollTimer) clearInterval(pollTimer);
    if (reserva.id) {
      pollStatus(reserva.id);
      pollTimer = setInterval(function () { pollStatus(reserva.id); }, 5000);
    }
  }

  function submitReserva(metodo) {
    setMsg(status, "");
    if (!aberto) {
      setMsg(status, "Reservas abrem em breve.", "erro");
      return;
    }
    if (!USERNAME_RE.test(userInput.value.trim())) {
      setMsg(status, "O nome deve ter 3 a 20 caracteres (letras, números ou _).", "erro");
      userInput.focus();
      return;
    }
    if (!emailInput.value.trim()) {
      setMsg(status, "Informe um e-mail válido.", "erro");
      emailInput.focus();
      return;
    }
    btn.disabled = true;
    if (cardBtn) cardBtn.disabled = true;
    fetch("/api/reservas", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        username: userInput.value,
        email: emailInput.value,
        website: form.website.value,
        metodo: metodo,
      }),
    })
      .then(function (res) {
        return res.json().then(function (data) { return { res: res, data: data }; });
      })
      .then(function (out) {
        if (!out.res.ok) {
          var msg = out.data && out.data.erro ? out.data.erro : "Não foi possível reservar.";
          if (out.data && out.data.detalhe && (out.data.detalhe.code || out.data.detalhe.message)) {
            var d = out.data.detalhe;
            msg += " (" + [d.code, d.message].filter(Boolean).join(" — ") + ")";
          }
          setMsg(status, msg, "erro");
          return;
        }
        if (out.data.pix && (out.data.pix.qr_code || out.data.pix.qr_code_base64)) {
          showPix(out.data);
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
        if (aberto && pixBox.hidden) {
          btn.disabled = false;
          if (cardBtn) cardBtn.disabled = false;
        }
      });
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    submitReserva("pix");
  });

  if (cardBtn) {
    cardBtn.addEventListener("click", function () {
      if (!USERNAME_RE.test(userInput.value.trim())) {
        setMsg(status, "O nome deve ter 3 a 20 caracteres (letras, números ou _).", "erro");
        userInput.focus();
        return;
      }
      if (!form.reportValidity()) return;
      submitReserva("card");
    });
  }

  var copyBtn = document.getElementById("pix-copy");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var code = document.getElementById("pix-copia").value;
      if (!code) return;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(function () {
          copyBtn.textContent = "Código copiado";
        }).catch(function () {});
      }
    });
  }

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
