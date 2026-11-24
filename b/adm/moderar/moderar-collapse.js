// Botões Encolher/Expandir das listas da moderação (estado salvo no localStorage).
(function () {
  "use strict";
  var PREFIX = "basedisso_mod_collapsed_";
  function get(key) { try { return localStorage.getItem(PREFIX + key) === "1"; } catch (e) { return false; } }
  function put(key, collapsed) {
    try { if (collapsed) localStorage.setItem(PREFIX + key, "1"); else localStorage.removeItem(PREFIX + key); } catch (e) {}
  }
  function apply(btn, target, collapsed) {
    target.hidden = collapsed;
    target.classList.add("mod-collapsible");
    btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
    btn.textContent = collapsed ? "Expandir" : "Encolher";
    btn.title = collapsed ? "Mostrar a lista" : "Esconder a lista";
  }
  var btns = document.querySelectorAll(".mod-collapse-btn[data-collapse][aria-controls]");
  Array.prototype.forEach.call(btns, function (btn) {
    var key = btn.getAttribute("data-collapse");
    var target = document.getElementById(btn.getAttribute("aria-controls"));
    if (!target) { btn.hidden = true; return; }
    apply(btn, target, get(key));
    btn.addEventListener("click", function () {
      var collapsed = !target.hidden;
      apply(btn, target, collapsed);
      put(key, collapsed);
    });
  });
})();
