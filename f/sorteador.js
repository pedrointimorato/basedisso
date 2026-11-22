/**
 * Sorteador de números (f/sorteador.html).
 * Inspirado no sorteio.com/random-number-generator: mínimo, máximo,
 * quantidade, opção de não repetir e animação de contagem.
 *
 * A aleatoriedade usa crypto.getRandomValues com rejeição, para cada
 * inteiro do intervalo ter a mesma chance (sem o viés de um simples %).
 */
(function () {
    const STORAGE_KEY = "basedisso-sorteador";
    const QTD_MAX = 1000;
    const HIST_MAX = 30;

    const elMin = document.getElementById("sort-min");
    const elMax = document.getElementById("sort-max");
    const elQtd = document.getElementById("sort-qtd");
    const elExcluir = document.getElementById("sort-excluir");
    const elUnico = document.getElementById("sort-unico");
    const elOrdenar = document.getElementById("sort-ordenar");
    const elAnimacao = document.getElementById("sort-animacao");
    const elStatus = document.getElementById("sort-status");
    const elNums = document.getElementById("sort-numbers");
    const elPlaceholder = document.getElementById("sort-placeholder");
    const elCount = document.getElementById("sort-countdown");
    const elMeta = document.getElementById("sort-meta");
    const elLista = document.getElementById("sort-list");
    const btnSortear = document.getElementById("btn-sortear");
    const btnDeNovo = document.getElementById("btn-sortear-de-novo");
    const btnCopiar = document.getElementById("btn-copiar");

    let ultimo = null;
    let ocupado = false;

    /**
     * Inteiro uniforme em [min, max], inclusive.
     * Rejeita valores acima do maior múltiplo do intervalo para não enviesar.
     */
    function inteiroAleatorio(min, max) {
        const lo = BigInt(min);
        const hi = BigInt(max);
        const range = hi - lo + 1n;
        if (range <= 0n) throw new RangeError("intervalo inválido");
        const bits = range.toString(2).length;
        const bytes = Math.ceil(bits / 8);
        const buf = new Uint8Array(bytes);
        const maxVal = 1n << BigInt(bytes * 8);
        const limite = (maxVal / range) * range;
        for (;;) {
            crypto.getRandomValues(buf);
            let x = 0n;
            for (let i = 0; i < buf.length; i++) x = (x << 8n) + BigInt(buf[i]);
            if (x < limite) return Number(lo + (x % range));
        }
    }

    function lerHistorico() {
        try {
            const bruto = localStorage.getItem(STORAGE_KEY);
            const dados = bruto ? JSON.parse(bruto) : [];
            return Array.isArray(dados) ? dados : [];
        } catch {
            return [];
        }
    }

    function gravarHistorico(lista) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lista.slice(0, HIST_MAX)));
    }

    function mostrarStatus(msg, ok) {
        elStatus.textContent = msg || "";
        elStatus.classList.toggle("is-ok", Boolean(ok));
    }

    function parseInteiro(valor, nome) {
        const n = Number(valor);
        if (!Number.isFinite(n) || !Number.isInteger(n)) {
            throw new Error(`Informe um número inteiro no campo ${nome}.`);
        }
        if (!Number.isSafeInteger(n)) {
            throw new Error(`O valor de ${nome} é grande demais.`);
        }
        return n;
    }

    function parseExcluidos(texto, min, max) {
        const raw = (texto || "").trim();
        if (!raw) return { set: new Set(), ignorados: 0 };
        const partes = raw.split(/[,;\s]+/).filter(Boolean);
        const set = new Set();
        let ignorados = 0;
        for (const p of partes) {
            if (!/^-?\d+$/.test(p)) {
                throw new Error(`Não deu para ler “${p}” na lista de exclusão. Use só números inteiros separados por vírgula.`);
            }
            const n = Number(p);
            if (n < min || n > max) ignorados++;
            else set.add(n);
        }
        return { set, ignorados };
    }

    function validar() {
        const min = parseInteiro(elMin.value, "Mínimo");
        const max = parseInteiro(elMax.value, "Máximo");
        const qtd = parseInteiro(elQtd.value, "Quantidade");
        if (max < min) {
            throw new Error("O máximo precisa ser maior ou igual ao mínimo.");
        }
        if (qtd < 1) {
            throw new Error("A quantidade precisa ser pelo menos 1.");
        }
        if (qtd > QTD_MAX) {
            throw new Error(`Dá para sortear no máximo ${QTD_MAX} números de uma vez.`);
        }
        const { set: excluidos, ignorados } = parseExcluidos(elExcluir.value, min, max);
        const disponiveis = (max - min + 1) - excluidos.size;
        if (disponiveis <= 0) {
            throw new Error("Depois das exclusões, não resta nenhum número no intervalo.");
        }
        const unico = elUnico.checked;
        if (unico && qtd > disponiveis) {
            throw new Error(`Não é possível sortear ${qtd} números diferentes entre ${min} e ${max}${excluidos.size ? " (descontando os excluídos)" : ""}. Só existem ${disponiveis} valores disponíveis.`);
        }
        return { min, max, qtd, excluidos, ignorados, unico, ordenar: elOrdenar.checked, animar: elAnimacao.checked };
    }

    function sortearNumeros(cfg) {
        const { min, max, qtd, excluidos, unico } = cfg;
        const saida = [];
        if (unico) {
            const n = max - min + 1;
            if (n <= 20000) {
                const pool = [];
                for (let i = min; i <= max; i++) {
                    if (!excluidos.has(i)) pool.push(i);
                }
                for (let i = 0; i < qtd; i++) {
                    const j = inteiroAleatorio(i, pool.length - 1);
                    const tmp = pool[i];
                    pool[i] = pool[j];
                    pool[j] = tmp;
                    saida.push(pool[i]);
                }
            } else {
                const escolhidos = new Set();
                while (escolhidos.size < qtd) {
                    const nro = inteiroAleatorio(min, max);
                    if (!excluidos.has(nro)) escolhidos.add(nro);
                }
                escolhidos.forEach((nro) => saida.push(nro));
            }
        } else {
            let tentativas = 0;
            const teto = qtd * 50 + 20;
            while (saida.length < qtd) {
                const nro = inteiroAleatorio(min, max);
                if (!excluidos.has(nro)) saida.push(nro);
                tentativas++;
                if (tentativas > teto) {
                    throw new Error("Não foi possível completar o sorteio com essas exclusões. Tente um intervalo maior ou menos exclusões.");
                }
            }
        }
        if (cfg.ordenar) saida.sort((a, b) => a - b);
        return saida;
    }

    function esperar(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function pintarNumeros(numeros) {
        elPlaceholder.classList.add("is-hidden");
        elCount.classList.add("is-hidden");
        elNums.classList.remove("is-hidden");
        elNums.innerHTML = "";
        numeros.forEach((n) => {
            const span = document.createElement("span");
            span.className = "sort-num";
            span.textContent = String(n);
            elNums.appendChild(span);
        });
    }

    async function animarContagem() {
        elPlaceholder.classList.add("is-hidden");
        elNums.classList.add("is-hidden");
        elCount.classList.remove("is-hidden");
        for (const n of [3, 2, 1]) {
            elCount.textContent = String(n);
            elCount.style.animation = "none";
            void elCount.offsetWidth;
            elCount.style.animation = "";
            await esperar(700);
        }
        elCount.classList.add("is-hidden");
    }

    function descrever(cfg, numeros) {
        const partes = [`de ${cfg.min} a ${cfg.max}`, `${numeros.length} ${numeros.length === 1 ? "número" : "números"}`];
        if (cfg.unico) partes.push("sem repetir");
        if (cfg.ordenar) partes.push("ordenado");
        if (cfg.excluidos.size) partes.push(`${cfg.excluidos.size} excluídos`);
        return partes.join(" · ");
    }

    function renderHistorico() {
        const lista = lerHistorico();
        if (!lista.length) {
            elLista.innerHTML = '<li class="sort-list-empty">Nenhum sorteio ainda.</li>';
            return;
        }
        elLista.innerHTML = "";
        lista.forEach((item) => {
            const li = document.createElement("li");
            li.className = "sort-item";
            const quando = new Date(item.at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
            const time = document.createElement("span");
            time.className = "sort-item-time";
            time.textContent = quando;
            const nums = document.createElement("div");
            nums.className = "sort-item-nums";
            nums.textContent = item.numeros.join(", ");
            const opts = document.createElement("span");
            opts.className = "sort-item-opts";
            opts.textContent = item.resumo || "";
            li.append(time, nums, opts);
            elLista.appendChild(li);
        });
    }

    function salvarHistorico(cfg, numeros) {
        const lista = lerHistorico();
        lista.unshift({
            at: Date.now(),
            numeros: numeros.slice(),
            resumo: descrever(cfg, numeros)
        });
        gravarHistorico(lista);
        renderHistorico();
    }

    async function copiar() {
        if (!ultimo || !ultimo.length) {
            mostrarStatus("Sorteie um número antes de copiar.");
            return;
        }
        const texto = ultimo.join(", ");
        try {
            await navigator.clipboard.writeText(texto);
            mostrarStatus("Resultado copiado.", true);
        } catch {
            const ta = document.createElement("textarea");
            ta.value = texto;
            ta.setAttribute("readonly", "");
            ta.style.position = "fixed";
            ta.style.left = "-9999px";
            document.body.appendChild(ta);
            ta.select();
            let ok = false;
            try { ok = document.execCommand("copy"); } catch { ok = false; }
            ta.remove();
            mostrarStatus(ok ? "Resultado copiado." : "Não foi possível copiar. Selecione os números e copie manualmente.", ok);
        }
    }

    async function executar() {
        if (ocupado) return;
        mostrarStatus("");
        let cfg;
        try {
            cfg = validar();
        } catch (err) {
            mostrarStatus(err.message || "Revise os valores informados.");
            return;
        }
        ocupado = true;
        btnSortear.disabled = true;
        btnDeNovo.disabled = true;
        try {
            const numeros = sortearNumeros(cfg);
            if (cfg.animar) await animarContagem();
            pintarNumeros(numeros);
            ultimo = numeros;
            elMeta.textContent = descrever(cfg, numeros);
            if (cfg.ignorados) {
                mostrarStatus(`${cfg.ignorados} número(s) da exclusão estavam fora do intervalo e foram ignorados.`, true);
            }
            salvarHistorico(cfg, numeros);
            btnDeNovo.classList.remove("is-hidden");
            btnCopiar.classList.remove("is-hidden");
        } catch (err) {
            mostrarStatus(err.message || "Não foi possível concluir o sorteio.");
        } finally {
            ocupado = false;
            btnSortear.disabled = false;
            btnDeNovo.disabled = false;
        }
    }

    btnSortear.addEventListener("click", executar);
    btnDeNovo.addEventListener("click", executar);
    btnCopiar.addEventListener("click", copiar);
    document.getElementById("btn-limpar-hist").addEventListener("click", () => {
        if (!lerHistorico().length) return;
        if (!confirm("Apagar o histórico de sorteios deste navegador?")) return;
        gravarHistorico([]);
        renderHistorico();
        mostrarStatus("Histórico apagado.", true);
    });

    renderHistorico();
})();
