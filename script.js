/**
 * Alterna as abas internas do corpo da sidebar e atualiza o estado dos botões do rodapé.
 * * @param {string} idAba - O sufixo do ID da aba (ex: 'meu', 'configuracoes', 'ofertas').
 * @param {Event} event - O evento de clique para capturar o botão ativo.
 */
function mudarAbaSidebar(idAba, tituloCabecalho, event) {
    // 1. Oculta todas as abas de conteúdo da sidebar
    const abas = document.querySelectorAll('.sidebar-tab-content');
    abas.forEach(aba => aba.classList.remove('active'));

    // 2. Exibe a aba de conteúdo que foi clicada
    const abaAlvo = document.getElementById(`tab-${idAba}`);
    if (abaAlvo) {
        abaAlvo.classList.add('active');
    }

    // 3. Atualiza o título no cabeçalho da sidebar
    document.getElementById('sidebar-tab-title').innerText = tituloCabecalho;

    // 4. Remove a classe de ativo de todos os botões do rodapé
    const botoesRodape = document.querySelectorAll('.footer-tab-btn');
    botoesRodape.forEach(btn => btn.classList.remove('active'));

    // 5. Adiciona o destaque visual ao botão do rodapé que foi clicado
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}  
// --- SISTEMA DE MODO ESCURO ---
document.addEventListener("DOMContentLoaded", () => {
    const themeToggle = document.getElementById("theme-toggle");

    // 1. Verifica se o usuário já tinha uma preferência salva anteriormente
    const temaSalvo = localStorage.getItem("tema") || "light";
    document.documentElement.setAttribute("data-theme", temaSalvo);

    if (!themeToggle) return;

    // Ajusta o estado visual do checkbox baseado no tema carregado
    if (temaSalvo === "dark") {
        themeToggle.checked = true;
    }

    // 2. Escuta o clique no checkbox para alternar o tema
    themeToggle.addEventListener("change", () => {
        if (themeToggle.checked) {
            document.documentElement.setAttribute("data-theme", "dark");
            localStorage.setItem("tema", "dark"); // Salva no navegador do usuário
        } else {
            document.documentElement.setAttribute("data-theme", "light");
            localStorage.setItem("tema", "light"); // Salva no navegador do usuário
        }
    });
});

function toggleSidebarMobile() {
    // Seleciona a barra lateral pela classe
    const sidebar = document.querySelector('.right-sidebar');
    
    // O ".classList.toggle" adiciona a classe se ela não existir, ou remove se já existir
    sidebar.classList.toggle('mobile-open');
}
// ===== FEED: CARDS INTERATIVOS =====
document.addEventListener("DOMContentLoaded", () => {
    // Ações do rodapé (curtir / salvar alternam estado)
    document.querySelectorAll(".card-action").forEach(btn => {
        btn.addEventListener("click", () => {
            const acao = btn.dataset.action;
            if (acao === "comentar") return;
            btn.classList.toggle("on");
            const icone = btn.querySelector("i");
            icone.classList.toggle("fa-regular");
            icone.classList.toggle("fa-solid");
        });
    });

    // Vídeo: troca a miniatura pelo player
    document.querySelectorAll(".video-wrap").forEach(wrap => {
        wrap.querySelector(".video-play").addEventListener("click", () => {
            const video = document.createElement("video");
            video.src = wrap.dataset.src;
            video.controls = true;
            video.autoplay = true;
            wrap.innerHTML = "";
            wrap.appendChild(video);
        });
    });

    // Checklist
    document.querySelectorAll(".card-ferramenta").forEach(card => {
        const lista = card.querySelector(".tool-checklist");
        if (!lista) return;
        const dica = card.querySelector(".tool-hint");
        const atualizar = () => {
            const itens = lista.querySelectorAll("li");
            let feitos = 0;
            itens.forEach(li => {
                const ok = li.querySelector("input").checked;
                li.classList.toggle("done", ok);
                if (ok) feitos++;
            });
            dica.textContent = `${feitos} de ${itens.length} concluídas`;
        };
        lista.addEventListener("change", atualizar);
        card.querySelector(".tool-add").addEventListener("submit", e => {
            e.preventDefault();
            const campo = e.target.querySelector("input");
            const texto = campo.value.trim();
            if (!texto) return;
            const li = document.createElement("li");
            const label = document.createElement("label");
            const cb = document.createElement("input");
            cb.type = "checkbox";
            label.append(cb, " " + texto);
            li.appendChild(label);
            lista.appendChild(li);
            campo.value = "";
            atualizar();
        });
        atualizar();
    });

    // Enquete
    document.querySelectorAll(".tool-poll").forEach(poll => {
        const votos = poll.dataset.votes.split(",").map(Number);
        const opcoes = poll.querySelectorAll(".poll-opt");
        const dica = poll.parentElement.querySelector(".tool-hint");
        let votou = false;
        opcoes.forEach((op, i) => {
            op.innerHTML = `<span class="poll-bar" style="width:0"></span><span class="poll-label">${op.textContent}</span><span class="poll-pct"></span>`;
            op.addEventListener("click", () => {
                if (votou) return;
                votou = true;
                votos[i]++;
                op.classList.add("voted");
                const total = votos.reduce((a, b) => a + b, 0);
                opcoes.forEach((o, j) => {
                    const pct = Math.round(votos[j] / total * 100);
                    o.querySelector(".poll-bar").style.width = pct + "%";
                    o.querySelector(".poll-pct").textContent = pct + "%";
                });
                dica.textContent = `${total} votos · obrigado por votar!`;
            });
        });
    });

    // Timer Pomodoro
    document.querySelectorAll(".tool-timer").forEach(t => {
        const inicial = Number(t.dataset.seconds);
        let resta = inicial, intervalo = null;
        const visor = t.querySelector(".timer-display");
        const btnStart = t.querySelector(".timer-start");
        const mostrar = () => {
            const m = String(Math.floor(resta / 60)).padStart(2, "0");
            const s = String(resta % 60).padStart(2, "0");
            visor.textContent = `${m}:${s}`;
        };
        const parar = () => {
            clearInterval(intervalo); intervalo = null;
            btnStart.innerHTML = '<i class="fa-solid fa-play"></i> Iniciar';
        };
        btnStart.addEventListener("click", () => {
            if (intervalo) { parar(); return; }
            btnStart.innerHTML = '<i class="fa-solid fa-pause"></i> Pausar';
            intervalo = setInterval(() => {
                if (resta > 0) { resta--; mostrar(); } else { parar(); }
            }, 1000);
        });
        t.querySelector(".timer-reset").addEventListener("click", () => { parar(); resta = inicial; mostrar(); });
        mostrar();
    });

    // Mini calendário
    document.querySelectorAll(".tool-calendar").forEach(cal => {
        const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
        const hoje = new Date();
        let ano = hoje.getFullYear(), mes = hoje.getMonth();
        const render = () => {
            const primeiro = new Date(ano, mes, 1).getDay();
            const dias = new Date(ano, mes + 1, 0).getDate();
            let html = `<div class="cal-head"><button data-d="-1"><i class="fa-solid fa-chevron-left"></i></button><span>${meses[mes]} ${ano}</span><button data-d="1"><i class="fa-solid fa-chevron-right"></i></button></div><div class="cal-grid">`;
            ["D","S","T","Q","Q","S","S"].forEach(d => html += `<span class="dow">${d}</span>`);
            for (let i = 0; i < primeiro; i++) html += "<span></span>";
            for (let d = 1; d <= dias; d++) {
                const eHoje = d === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear();
                html += `<span class="day${eHoje ? " today" : ""}">${d}</span>`;
            }
            cal.innerHTML = html + "</div>";
            cal.querySelectorAll(".cal-head button").forEach(b => b.addEventListener("click", () => {
                mes += Number(b.dataset.d);
                if (mes < 0) { mes = 11; ano--; } else if (mes > 11) { mes = 0; ano++; }
                render();
            }));
            cal.querySelectorAll(".day").forEach(d => d.addEventListener("click", () => {
                cal.querySelectorAll(".day.sel").forEach(x => x.classList.remove("sel"));
                d.classList.add("sel");
            }));
        };
        render();
    });
});

document.addEventListener("DOMContentLoaded", () => {
    if (location.hash === "#adm") {
        const btn = document.querySelector('.footer-tab-btn[onclick*="ofertas"]');
        mudarAbaSidebar("ofertas", "ADM", btn ? { currentTarget: btn } : null);
    }
});
