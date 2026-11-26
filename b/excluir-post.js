// Botão "excluir" da própria postagem (página da postagem e listas das comunidades).
(function () {
  "use strict";
  document.addEventListener("click", function (ev) {
    var btn = ev.target && ev.target.closest ? ev.target.closest("[data-excluir-post]") : null;
    if (!btn) return;
    ev.preventDefault();
    if (!confirm("Excluir esta postagem? Isso não pode ser desfeito.")) return;
    var id = btn.getAttribute("data-excluir-post");
    var thing = btn.closest(".or-thing");
    var msg = thing ? thing.querySelector(".or-excluir-msg") : document.querySelector(".or-excluir-msg");
    btn.disabled = true;
    fetch("/api/posts/" + encodeURIComponent(id), { method: "DELETE", credentials: "same-origin", headers: { Accept: "application/json" } })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (d) {
          if (!res.ok) {
            btn.disabled = false;
            if (msg) { msg.hidden = false; msg.textContent = (d && d.erro) || "Não foi possível excluir."; msg.className = "or-excluir-msg erro"; }
            else alert((d && d.erro) || "Não foi possível excluir.");
            return;
          }
          if (thing) {
            // Na lista: some da listagem.
            thing.parentNode.removeChild(thing);
            return;
          }
          // Na página da postagem: com comentários, recarrega (mostra o aviso); sem, volta à comunidade.
          if (d.modo === "marcado") location.reload();
          else location.href = (btn.getAttribute("data-voltar") || "/b/") + "?excluida=1";
        });
      })
      .catch(function () {
        btn.disabled = false;
        if (msg) { msg.hidden = false; msg.textContent = "Falha de rede."; msg.className = "or-excluir-msg erro"; }
      });
  });
  // ADMs: "fixar"/"desafixar" postagem (lista da comunidade e página da postagem).
  document.addEventListener("click", function (ev) {
    var btn = ev.target && ev.target.closest ? ev.target.closest("[data-fixar-post]") : null;
    if (!btn) return;
    ev.preventDefault();
    var id = btn.getAttribute("data-fixar-post");
    var fixar = btn.getAttribute("data-fixado") !== "1";
    var thing = btn.closest(".or-thing");
    var msg = thing ? thing.querySelector(".or-excluir-msg") : document.querySelector(".or-excluir-msg");
    btn.disabled = true;
    fetch("/api/moderation/posts/" + encodeURIComponent(id), {
      method: "PATCH",
      credentials: "same-origin",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ fixado: fixar }),
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (d) {
          if (res.ok) { location.reload(); return; }
          btn.disabled = false;
          var t = (d && d.erro) || "Não foi possível " + (fixar ? "fixar." : "desafixar.");
          if (msg) { msg.hidden = false; msg.textContent = t; msg.className = "or-excluir-msg erro"; }
          else alert(t);
        });
      })
      .catch(function () { btn.disabled = false; alert("Falha de rede."); });
  });
})();
