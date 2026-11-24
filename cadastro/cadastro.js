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
    if (codeInput && CODE_RE.test(codeInput.value.trim()) && document.activeElement &&
        (document.activeElement === codeInput || document.activeElement === codePass)) {
      submitCodigo();
      return;
    }
    submitReserva("pix");
  });

  /* ---------- Código de convite/acesso ---------- */
  var CODE_RE = /^[A-Za-z0-9]{6}$/;
  var codeInput = document.getElementById("reserva-codigo");
  var codeFeedback = document.getElementById("codigo-feedback");
  var codeExtra = document.getElementById("codigo-extra");
  var codePass = document.getElementById("codigo-senha");
  var codeBtn = document.getElementById("codigo-btn");
  var codeStatus = document.getElementById("codigo-status");
  var codeTimer = null;
  var codeSeq = 0;

  function fmtLeft(ms) {
    if (ms <= 0) return "agora";
    var min = Math.floor(ms / 60000);
    var d = Math.floor(min / 1440);
    var h = Math.floor((min % 1440) / 60);
    var m = min % 60;
    if (d > 0) return d + "d " + h + "h";
    if (h > 0) return h + "h " + (m < 10 ? "0" : "") + m + "min";
    return Math.max(m, 1) + " min";
  }

  function validateCode() {
    var v = codeInput.value.trim();
    var seq = ++codeSeq;
    if (!v) {
      setMsg(codeFeedback, "");
      codeExtra.hidden = true;
      return;
    }
    if (v.length < 6) {
      setMsg(codeFeedback, "O código tem 6 caracteres (letras e/ou números).", "");
      codeExtra.hidden = true;
      return;
    }
    codeExtra.hidden = false;
    if (!CODE_RE.test(v)) {
      setMsg(codeFeedback, "Use apenas letras e números (6 caracteres).", "erro");
      return;
    }
    setMsg(codeFeedback, "Verificando código…", "");
    fetch("/api/convites/validar?code=" + encodeURIComponent(v), {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (seq !== codeSeq) return;
        if (data && data.valido) {
          setMsg(codeFeedback, "Código válido · expira em " + fmtLeft(new Date(data.expires_at).getTime() - Date.now()) + ".", "ok");
        } else {
          setMsg(codeFeedback, (data && data.motivo) || "Código inválido.", "erro");
        }
      })
      .catch(function () { if (seq === codeSeq) setMsg(codeFeedback, ""); });
  }

  function submitCodigo() {
    setMsg(codeStatus, "");
    var nome = userInput.value.trim();
    var code = codeInput.value.trim();
    if (!USERNAME_RE.test(nome)) {
      setMsg(codeStatus, "O nome deve ter 3 a 20 caracteres (letras, números ou _).", "erro");
      userInput.focus();
      return;
    }
    if (!CODE_RE.test(code)) {
      setMsg(codeStatus, "O código tem 6 caracteres: letras e/ou números.", "erro");
      codeInput.focus();
      return;
    }
    if (codePass.value.length < 8) {
      setMsg(codeStatus, "A senha deve ter pelo menos 8 caracteres.", "erro");
      codePass.focus();
      return;
    }
    codeBtn.disabled = true;
    fetch("/api/auth/signup-codigo", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        username: nome,
        email: emailInput.value.trim(),
        password: codePass.value,
        code: code,
        website: form.website.value,
      }),
    })
      .then(function (res) { return res.json().then(function (data) { return { res: res, data: data }; }); })
      .then(function (out) {
        if (!out.res.ok) {
          setMsg(codeStatus, (out.data && out.data.erro) || "Não foi possível criar a conta.", "erro");
          return;
        }
        var u = out.data.usuario || {};
        setMsg(codeStatus, "Conta criada! Você é o primordial #" + u.primordial_n + ". Abrindo seu perfil…", "ok");
        setTimeout(function () { location.href = "/@" + encodeURIComponent(u.username || nome); }, 900);
      })
      .catch(function () { setMsg(codeStatus, "Falha de rede. Tente de novo.", "erro"); })
      .then(function () { codeBtn.disabled = false; });
  }

  if (codeInput) {
    codeInput.addEventListener("input", function () {
      var clean = codeInput.value.replace(/\s+/g, "").toUpperCase();
      if (clean !== codeInput.value) codeInput.value = clean;
      clearTimeout(codeTimer);
      codeTimer = setTimeout(validateCode, 250);
    });
    codeBtn.addEventListener("click", submitCodigo);
    window.BDCadastro = {
      usarCodigo: function (code) {
        codeInput.value = String(code || "").toUpperCase();
        validateCode();
        codeInput.scrollIntoView({ behavior: "smooth", block: "center" });
        codeInput.classList.remove("codigo-flash");
        void codeInput.offsetWidth;
        codeInput.classList.add("codigo-flash");
        setTimeout(function () {
          try { (userInput.value.trim() ? codePass : userInput).focus({ preventScroll: true }); } catch (e) {}
        }, 500);
      },
    };
    var pre = (location.search.match(/[?&]codigo=([A-Za-z0-9]{6})/) || [])[1];
    if (pre) { codeInput.value = pre.toUpperCase(); validateCode(); }
  }

  if (cardBtn) {
    cardBtn.addEventListener("click", function () {
      if (!USERNAME_RE.test(userInput.value.trim())) {
        setMsg(status, "O nome deve ter 3 a 20 caracteres (letras, números ou _).", "erro");
        userInput.focus();
        return;
      }
      if (!form.reportValidity()) return;
      if (!emailInput.value.trim()) {
        setMsg(status, "Informe um e-mail válido.", "erro");
        emailInput.focus();
        return;
      }
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
