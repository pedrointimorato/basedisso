/* /l/: reflete na capa da estante o título/subtítulo/contagem salvos da Bíblia Amarela. */
(function () {
  "use strict";
  function set(sel, txt) { var n = document.querySelector(sel); if (n && txt) n.textContent = txt; }
  fetch("/api/l/biblia-amarela", { credentials: "same-origin", headers: { Accept: "application/json" } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d || !d.meta || !Array.isArray(d.livros)) return;
      var capa = d.meta.titulo_capa || d.meta.titulo;
      set(".book-lg .book-title", capa);
      set(".book-lg .book-spine > span", capa);
      var sub = document.querySelector(".book-lg .book-sub");
      if (sub) { sub.textContent = d.meta.subtitulo || ""; sub.hidden = !d.meta.subtitulo; }
      var link = document.querySelector("a.book-lg");
      if (link) link.setAttribute("aria-label", "Abrir " + capa);
      var escritos = d.livros.filter(function (l) { return String(l.texto || "").trim(); }).length;
      set("#ba-estante-count", escritos + " de " + d.livros.length + (d.livros.length === 1 ? " livro escrito" : " livros escritos"));
      var adm = document.getElementById("ba-estante-adm");
      if (adm && d.pode_editar === true) adm.hidden = false;
    })
    .catch(function () {});
})();
