(function () {
    function bind(root) {
        root = root || document;
        root.querySelectorAll(".or-midcol").forEach((col) => {
            if (col.dataset.bound) return;
            col.dataset.bound = "1";
            const up = col.querySelector(".or-up");
            const down = col.querySelector(".or-down");
            const score = col.querySelector(".or-score");
            if (!up || !down || !score) return;
            up.addEventListener("click", () => {
                const on = up.classList.toggle("is-on");
                down.classList.remove("is-on");
                col.classList.toggle("is-up", on);
                col.classList.remove("is-down");
                score.textContent = on ? "2" : "1";
            });
            down.addEventListener("click", () => {
                const on = down.classList.toggle("is-on");
                up.classList.remove("is-on");
                col.classList.toggle("is-down", on);
                col.classList.remove("is-up");
                score.textContent = on ? "0" : "1";
            });
        });
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
