(function () {
    function bind(root) {
        root = root || document;
        // MOR-35: votos de verdade ficam em /votos.js (rodapé); aqui só o "salvar" local.
        root.querySelectorAll(".or-save").forEach((btn) => {
            if (btn.dataset.bound) return;
            btn.dataset.bound = "1";
            btn.addEventListener("click", () => {
                const on = btn.classList.toggle("is-on");
                btn.textContent = on ? "salvo" : "salvar";
            });
        });
    }
    window.BDComunidadesUI = { bind: bind };
    document.addEventListener("DOMContentLoaded", () => bind(document));
})();
