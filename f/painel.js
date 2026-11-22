/**
 * Filtro e busca do painel de ferramentas (f/index.html).
 */
(function () {
    const busca = document.getElementById("tools-busca");
    const chips = document.getElementById("tools-chips");
    const grid = document.getElementById("tools-grid");
    const tiles = Array.from(grid.querySelectorAll(".tool-tile"));
    let categoria = "todas";

    function normalizar(s) {
        return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    function filtrar() {
        const q = normalizar(busca.value.trim());
        let visiveis = 0;
        tiles.forEach((tile) => {
            const cat = tile.dataset.cat || "";
            const texto = normalizar((tile.dataset.name || "") + " " + tile.textContent);
            const okCat = categoria === "todas" || cat === categoria;
            const okBusca = !q || texto.includes(q);
            const show = okCat && okBusca;
            tile.hidden = !show;
            if (show) visiveis++;
        });
        let vazio = grid.querySelector(".tools-empty");
        if (!visiveis) {
            if (!vazio) {
                vazio = document.createElement("p");
                vazio.className = "tools-empty";
                vazio.textContent = "Nenhuma ferramenta encontrada.";
                grid.appendChild(vazio);
            }
        } else if (vazio) {
            vazio.remove();
        }
    }

    chips.addEventListener("click", (ev) => {
        const btn = ev.target.closest(".tools-chip");
        if (!btn) return;
        chips.querySelectorAll(".tools-chip").forEach((c) => c.classList.remove("is-on"));
        btn.classList.add("is-on");
        categoria = btn.dataset.cat;
        filtrar();
    });
    busca.addEventListener("input", filtrar);
})();
