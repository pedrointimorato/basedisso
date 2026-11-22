/**
 * Área de transferência local (f/clipboard.html).
 *
 * O site é estático: códigos curtos vivem no localStorage deste navegador.
 * O link de compartilhamento embute o texto (compactado + base64) no hash da
 * URL, para abrir em outro aparelho sem servidor — com limite de tamanho.
 *
 * BACKEND (quando houver API):
 *  - Salvar:  POST /clips  { code, title, text, expiresAt }
 *    e devolver só o código (em vez de guardar em localStorage e no hash).
 *  - Recuperar: GET /clips/:code  → { title, text, expiresAt }
 *    no lugar de lerClips() / buscarPorCodigo().
 *  - Excluir: DELETE /clips/:code
 *  - O hash #p=… deixa de ser necessário; o link viraria /f/clipboard.html?k=CODIGO
 *    ou /c/CODIGO, resolvido no servidor.
 */
(function () {
    const STORAGE_KEY = "basedisso-clipboard";
    const ALFABETO = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    const LIMITE_LINK = 7000;

    const elTexto = document.getElementById("clip-text");
    const elTitulo = document.getElementById("clip-title");
    const elExpiry = document.getElementById("clip-expiry");
    const elCounts = document.getElementById("clip-counts");
    const elStatus = document.getElementById("clip-status");
    const elLista = document.getElementById("clip-list");
    const elResult = document.getElementById("clip-result");
    const elResultCode = document.getElementById("result-code");
    const elResultExpiry = document.getElementById("result-expiry");
    const elResultLink = document.getElementById("result-link");
    const elResultHint = document.getElementById("result-link-hint");
    const elCodeInput = document.getElementById("clip-code-input");

    let recorteAtual = null;

    function agora() {
        return Date.now();
    }

    function lerClips() {
        // BACKEND: substituir por GET /clips (lista do usuário ou desta sessão).
        try {
            const bruto = localStorage.getItem(STORAGE_KEY);
            const dados = bruto ? JSON.parse(bruto) : [];
            return Array.isArray(dados) ? dados : [];
        } catch {
            return [];
        }
    }

    function gravarClips(lista) {
        // BACKEND: cada mutação iria para POST/DELETE no servidor.
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
    }

    function purgeExpirados(lista) {
        const t = agora();
        return lista.filter((c) => !c.expiresAt || c.expiresAt > t);
    }

    function gerarCodigo(existentes) {
        const usados = new Set(existentes.map((c) => c.code));
        for (let tentativa = 0; tentativa < 50; tentativa++) {
            const bytes = new Uint8Array(5);
            crypto.getRandomValues(bytes);
            let code = "";
            for (const b of bytes) code += ALFABETO[b % ALFABETO.length];
            if (!usados.has(code)) return code;
        }
        return String(agora()).slice(-6);
    }

    function contar(texto) {
        const chars = Array.from(texto).length;
        const trimmed = texto.trim();
        const palavras = trimmed ? trimmed.split(/\s+/).length : 0;
        const linhas = texto.length ? texto.split(/\n/).length : 0;
        return { chars, palavras, linhas };
    }

    function atualizarContagem() {
        const { chars, palavras, linhas } = contar(elTexto.value);
        elCounts.textContent = `${palavras} ${palavras === 1 ? "palavra" : "palavras"} · ${chars} ${chars === 1 ? "caractere" : "caracteres"} · ${linhas} ${linhas === 1 ? "linha" : "linhas"}`;
    }

    function mostrarStatus(msg, ok) {
        elStatus.textContent = msg;
        elStatus.classList.toggle("is-ok", Boolean(ok));
    }

    function previewTexto(texto, titulo) {
        const base = (titulo || "").trim() || texto.trim().split(/\n/)[0] || "Sem título";
        return base.length > 60 ? base.slice(0, 57) + "…" : base;
    }

    function formatarQuando(ts) {
        const diff = agora() - ts;
        const min = Math.floor(diff / 60000);
        if (min < 1) return "agora";
        if (min < 60) return `há ${min} min`;
        const h = Math.floor(min / 60);
        if (h < 24) return `há ${h} h`;
        const d = Math.floor(h / 24);
        return d === 1 ? "há 1 dia" : `há ${d} dias`;
    }

    function formatarValidade(expiresAt) {
        if (!expiresAt) return "Sem prazo de validade";
        const resta = expiresAt - agora();
        if (resta <= 0) return "Expirado";
        const data = new Date(expiresAt);
        const hora = data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
        return `Válido até ${hora}`;
    }

    function renderLista() {
        const lista = purgeExpirados(lerClips());
        gravarClips(lista);
        if (!lista.length) {
            elLista.innerHTML = '<li class="clip-list-empty">Nenhum recorte salvo ainda.</li>';
            return;
        }
        elLista.innerHTML = "";
        lista.slice().reverse().forEach((clip) => {
            const li = document.createElement("li");
            li.className = "clip-item";
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "clip-item-main";
            btn.innerHTML = `<span class="clip-item-title"></span><span class="clip-item-meta"><span class="clip-item-code"></span> · ${formatarQuando(clip.created)} · ${formatarValidade(clip.expiresAt)}</span>`;
            btn.querySelector(".clip-item-title").textContent = previewTexto(clip.text, clip.title);
            btn.querySelector(".clip-item-code").textContent = clip.code;
            btn.addEventListener("click", () => abrirClip(clip, "Recorte carregado."));
            const del = document.createElement("button");
            del.type = "button";
            del.className = "clip-item-delete";
            del.setAttribute("aria-label", "Excluir recorte " + clip.code);
            del.innerHTML = '<i class="fa-solid fa-trash"></i>';
            del.addEventListener("click", () => excluirClip(clip.code));
            li.append(btn, del);
            elLista.appendChild(li);
        });
    }

    function mostrarResultado(clip, link, avisoLink) {
        recorteAtual = clip;
        elResult.classList.remove("is-hidden");
        elResultCode.textContent = clip.code || "—";
        elResultExpiry.textContent = formatarValidade(clip.expiresAt);
        elResultLink.value = link || "";
        elResultHint.textContent = avisoLink || "";
        elResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    function abrirClip(clip, mensagem) {
        elTitulo.value = clip.title || "";
        elTexto.value = clip.text || "";
        atualizarContagem();
        mostrarResultado(clip, clip.shareUrl || "", clip.shareHint || "");
        if (mensagem) mostrarStatus(mensagem, true);
    }

    function excluirClip(code) {
        // BACKEND: DELETE /clips/:code
        const lista = lerClips().filter((c) => c.code !== code);
        gravarClips(lista);
        if (recorteAtual && recorteAtual.code === code) {
            recorteAtual = null;
            elResult.classList.add("is-hidden");
        }
        renderLista();
        mostrarStatus("Recorte excluído.", true);
    }

    function apagarTodos() {
        if (!lerClips().length) return;
        if (!confirm("Apagar todos os recortes salvos neste navegador?")) return;
        // BACKEND: DELETE /clips (ou equivalente).
        gravarClips([]);
        recorteAtual = null;
        elResult.classList.add("is-hidden");
        renderLista();
        mostrarStatus("Todos os recortes foram apagados.", true);
    }

    async function copiar(texto) {
        try {
            await navigator.clipboard.writeText(texto);
            return true;
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
            return ok;
        }
    }

    function toBase64url(bytes) {
        let bin = "";
        const passo = 0x8000;
        for (let i = 0; i < bytes.length; i += passo) {
            bin += String.fromCharCode.apply(null, bytes.subarray(i, i + passo));
        }
        return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }

    function fromBase64url(str) {
        const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
        const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes;
    }

    async function compactarPayload(obj) {
        const json = JSON.stringify(obj);
        const bytes = new TextEncoder().encode(json);
        if (typeof CompressionStream === "function") {
            try {
                const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
                const buf = await new Response(stream).arrayBuffer();
                return "g" + toBase64url(new Uint8Array(buf));
            } catch {
                /* cai no modo cru */
            }
        }
        return "r" + toBase64url(bytes);
    }

    async function expandirPayload(token) {
        if (!token || token.length < 2) throw new Error("vazio");
        const modo = token[0];
        const bytes = fromBase64url(token.slice(1));
        let texto;
        if (modo === "g" && typeof DecompressionStream === "function") {
            const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
            const buf = await new Response(stream).arrayBuffer();
            texto = new TextDecoder().decode(buf);
        } else if (modo === "r") {
            texto = new TextDecoder().decode(bytes);
        } else {
            throw new Error("formato");
        }
        const dados = JSON.parse(texto);
        if (!dados || typeof dados.x !== "string") throw new Error("payload");
        return dados;
    }

    function urlBase() {
        const u = new URL(location.href);
        u.hash = "";
        u.search = "";
        return u.toString().replace(/#$/, "");
    }

    async function montarLink(clip) {
        // BACKEND: o link ideal seria urlBase() + "?k=" + clip.code (resolvido no servidor).
        const payload = await compactarPayload({
            t: clip.title || "",
            x: clip.text,
            e: clip.expiresAt || 0
        });
        const link = urlBase() + "#p=" + payload;
        if (link.length > LIMITE_LINK) {
            return {
                link: "",
                aviso: "O texto é grande demais para caber num link. Neste site estático, use o código só neste navegador — ou encurte o texto. Com um servidor, o código curto funcionaria em qualquer aparelho."
            };
        }
        return {
            link,
            aviso: "Este link leva o texto na própria URL. Funciona em outro aparelho, mas quem tiver o link lê o conteúdo. Evite senhas e dados pessoais. Links muito longos podem ser recusados por alguns apps."
        };
    }

    async function salvar() {
        const text = elTexto.value;
        if (!text.trim()) {
            mostrarStatus("Cole um texto antes de salvar.");
            elTexto.focus();
            return;
        }
        const segundos = Number(elExpiry.value) || 0;
        let lista = purgeExpirados(lerClips());
        const clip = {
            code: gerarCodigo(lista),
            title: elTitulo.value.trim(),
            text,
            created: agora(),
            expiresAt: segundos ? agora() + segundos * 1000 : 0
        };
        // BACKEND: POST /clips e usar o código devolvido pelo servidor.
        lista.push(clip);
        gravarClips(lista);
        const { link, aviso } = await montarLink(clip);
        clip.shareUrl = link;
        clip.shareHint = aviso;
        abrirClip(clip, "Recorte salvo. Código: " + clip.code);
        renderLista();
    }

    function buscarPorCodigo(code) {
        // BACKEND: GET /clips/:code — aqui a busca é só no localStorage deste navegador.
        const lista = purgeExpirados(lerClips());
        gravarClips(lista);
        return lista.find((c) => c.code === code) || null;
    }

    async function recuperar(ev) {
        if (ev) ev.preventDefault();
        const code = elCodeInput.value.trim().toUpperCase().replace(/[^0-9A-Z]/g, "");
        if (!code) {
            mostrarStatus("Digite um código para recuperar.");
            elCodeInput.focus();
            return;
        }
        const clip = buscarPorCodigo(code);
        if (!clip) {
            mostrarStatus("Código não encontrado neste navegador. Se o recorte foi salvo em outro aparelho, abra o link de compartilhamento (os códigos curtos ainda não têm servidor).");
            return;
        }
        const { link, aviso } = await montarLink(clip);
        clip.shareUrl = link;
        clip.shareHint = aviso;
        abrirClip(clip, "Recorte recuperado.");
    }

    async function abrirHash() {
        const hash = location.hash || "";
        if (hash.startsWith("#p=")) {
            try {
                const dados = await expandirPayload(hash.slice(3));
                if (dados.e && dados.e < agora()) {
                    mostrarStatus("Este link já expirou.");
                    history.replaceState(null, "", location.pathname + location.search);
                    return;
                }
                const clip = {
                    code: "LINK",
                    title: dados.t || "",
                    text: dados.x,
                    created: agora(),
                    expiresAt: dados.e || 0,
                    shareUrl: location.href,
                    shareHint: "Texto aberto a partir do link. Ele ainda não foi salvo neste navegador — use Salvar se quiser um código local."
                };
                abrirClip(clip, "Texto recebido pelo link.");
            } catch {
                mostrarStatus("Não foi possível ler o link. Ele pode estar incompleto ou corrompido.");
            }
            return;
        }
        if (hash.startsWith("#k=")) {
            elCodeInput.value = hash.slice(3).toUpperCase();
            await recuperar();
        }
    }

    function baixar() {
        const texto = elTexto.value;
        if (!texto) {
            mostrarStatus("Não há texto para baixar.");
            return;
        }
        const nomeBase = (elTitulo.value.trim() || recorteAtual && recorteAtual.code || "recorte")
            .replace(/[^\w\-]+/g, "_")
            .slice(0, 40);
        const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = nomeBase + ".txt";
        a.click();
        URL.revokeObjectURL(a.href);
        mostrarStatus("Download iniciado.", true);
    }

    function limpar() {
        elTitulo.value = "";
        elTexto.value = "";
        elCodeInput.value = "";
        recorteAtual = null;
        elResult.classList.add("is-hidden");
        atualizarContagem();
        mostrarStatus("");
        elTexto.focus();
    }

    document.getElementById("btn-salvar").addEventListener("click", () => { salvar(); });
    document.getElementById("btn-limpar").addEventListener("click", limpar);
    document.getElementById("form-recuperar").addEventListener("submit", recuperar);
    document.getElementById("btn-apagar-todos").addEventListener("click", apagarTodos);
    document.getElementById("btn-copiar-texto").addEventListener("click", async () => {
        const ok = await copiar(elTexto.value);
        mostrarStatus(ok ? "Texto copiado." : "Não foi possível copiar. Selecione o texto e copie manualmente.", ok);
    });
    document.getElementById("btn-copiar-codigo").addEventListener("click", async () => {
        const code = recorteAtual && recorteAtual.code;
        if (!code || code === "LINK") {
            mostrarStatus("Salve o recorte para gerar um código.");
            return;
        }
        const ok = await copiar(code);
        mostrarStatus(ok ? "Código copiado." : "Não foi possível copiar o código.", ok);
    });
    document.getElementById("btn-copiar-link").addEventListener("click", async () => {
        const link = elResultLink.value;
        if (!link) {
            mostrarStatus(elResultHint.textContent || "Não há link para copiar.");
            return;
        }
        const ok = await copiar(link);
        mostrarStatus(ok ? "Link copiado." : "Não foi possível copiar o link. Copie o campo manualmente.", ok);
    });
    document.getElementById("btn-baixar").addEventListener("click", baixar);
    elTexto.addEventListener("input", atualizarContagem);

    atualizarContagem();
    renderLista();
    abrirHash();
})();
