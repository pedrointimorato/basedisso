(function () {
    document.querySelectorAll(".or-midcol").forEach((col) => {
        const up = col.querySelector(".or-up");
        const down = col.querySelector(".or-down");
        const score = col.querySelector(".or-score");
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
    document.querySelectorAll(".or-save").forEach((btn) => {
        btn.addEventListener("click", () => {
            const on = btn.classList.toggle("is-on");
            btn.textContent = on ? "salvo" : "salvar";
        });
    });
    const sub = document.getElementById("or-subscribe");
    if (sub) {
        sub.addEventListener("click", () => {
            const on = sub.classList.toggle("is-on");
            sub.textContent = on ? "inscrito" : "inscrever-se";
        });
    }
})();
