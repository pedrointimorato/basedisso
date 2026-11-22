(function () {
  "use strict";
  var form = document.getElementById("login-form");
  var status = document.getElementById("login-status");
  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    status.textContent = "";
    status.className = "auth-status";
    var nome = document.getElementById("login-username").value.trim();
    if (!/^[A-Za-z0-9_]{3,20}$/.test(nome)) {
      status.textContent = "O nome deve ter 3 a 20 caracteres (letras, números ou _).";
      status.classList.add("erro");
      document.getElementById("login-username").focus();
      return;
    }
    var btn = form.querySelector(".auth-submit");
    btn.disabled = true;
    fetch("/api/auth/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        username: document.getElementById("login-username").value,
        password: document.getElementById("login-password").value,
        website: form.website.value,
      }),
    })
      .then(function (res) {
        return res.json().then(function (data) { return { res: res, data: data }; });
      })
      .then(function (out) {
        if (!out.res.ok) {
          status.textContent = out.data && out.data.erro ? out.data.erro : "Não foi possível entrar.";
          status.classList.add("erro");
          return;
        }
        var next = new URLSearchParams(location.search).get("next") || "/";
        if (next.charAt(0) !== "/") next = "/";
        location.href = next;
      })
      .catch(function () {
        status.textContent = "Falha de rede. Tente de novo.";
        status.classList.add("erro");
      })
      .then(function () { btn.disabled = false; });
  });
})();
