(function () {
  "use strict";
  var form = document.getElementById("signup-form");
  var status = document.getElementById("signup-status");
  var claimBox = document.getElementById("claim-box");
  var claimBtn = document.getElementById("claim-btn");
  var userInput = document.getElementById("signup-username");

  fetch("/api/auth/cadastro-info", { credentials: "same-origin", headers: { Accept: "application/json" } })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data && data.can_claim_intimorato) {
        claimBox.hidden = false;
      }
    })
    .catch(function () {});

  claimBtn.addEventListener("click", function () {
    userInput.value = "Intimorato";
    userInput.readOnly = true;
    document.getElementById("signup-password").focus();
    status.textContent = "Preencha uma senha sua para reivindicar >>Intimorato.";
    status.className = "auth-status ok";
  });

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    status.textContent = "";
    status.className = "auth-status";
    var pw = document.getElementById("signup-password").value;
    var pw2 = document.getElementById("signup-password2").value;
    if (pw !== pw2) {
      status.textContent = "As senhas não coincidem.";
      status.classList.add("erro");
      return;
    }
    var btn = form.querySelector(".auth-submit");
    btn.disabled = true;
    fetch("/api/auth/signup", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        username: userInput.value,
        password: pw,
        email: document.getElementById("signup-email").value,
        website: form.website.value,
      }),
    })
      .then(function (res) {
        return res.json().then(function (data) { return { res: res, data: data }; });
      })
      .then(function (out) {
        if (!out.res.ok) {
          status.textContent = out.data && out.data.erro ? out.data.erro : "Não foi possível cadastrar.";
          status.classList.add("erro");
          return;
        }
        var name = out.data.usuario && out.data.usuario.username;
        location.href = name ? "/@" + name : "/";
      })
      .catch(function () {
        status.textContent = "Falha de rede. Tente de novo.";
        status.classList.add("erro");
      })
      .then(function () { btn.disabled = false; });
  });
})();
