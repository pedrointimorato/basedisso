/* Wiki: no celular o índice começa recolhido; no computador fica sempre aberto. */
(function () {
  var d = document.querySelector(".wiki-nav details");
  if (!d || !window.matchMedia) return;
  var mq = window.matchMedia("(max-width: 900px)");
  function ajusta() { d.open = !mq.matches; }
  ajusta();
  if (mq.addEventListener) mq.addEventListener("change", ajusta);
  else if (mq.addListener) mq.addListener(ajusta);
})();
