// Reescreve <time data-hora-local datetime="ISO"> para o fuso do dispositivo (pt-BR).
(function () {
  "use strict";
  function apply(root) {
    var nodes = (root || document).querySelectorAll("time[data-hora-local][datetime]");
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var d = new Date(n.getAttribute("datetime"));
      if (isNaN(d.getTime())) continue;
      try {
        n.textContent = d.toLocaleString("pt-BR");
        n.setAttribute("title", d.toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "long" }));
        n.setAttribute("data-hora-ok", "1");
      } catch (e) { /* mantém o texto em UTC */ }
    }
  }
  window.BDHoraLocal = { apply: apply };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { apply(); });
  else apply();
})();
