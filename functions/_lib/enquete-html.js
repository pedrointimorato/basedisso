// HTML da enquete renderizado no servidor (espelhado em /b/enquete.js).
import { escapeHtml } from "./shared.js";
import { localTimeHtml } from "./hora.js";
import { asciiBar, prazoTexto } from "./enquete.js";

function votosTxt(n) {
  return n === 1 ? "1 voto" : `${n} votos`;
}

export function pollHtml(poll) {
  if (!poll) return "";
  const prazo = poll.encerrada
    ? `encerrada em ${localTimeHtml(poll.encerra_em)}`
    : `${escapeHtml(prazoTexto(poll.encerra_em))} <span class="bd-poll-quando">(${localTimeHtml(poll.encerra_em)})</span>`;
  const head = `<p class="bd-poll-head"><span class="bd-poll-tag">[enquete]</span> <span class="bd-poll-total">${votosTxt(poll.total)}</span> · <span class="bd-poll-prazo">${prazo}</span></p>`;
  let main;
  if (poll.mostra_resultado) {
    const max = Math.max(0, ...poll.opcoes.map((o) => o.votos || 0));
    main = `<ol class="bd-poll-results">${poll.opcoes
      .map((o) => {
        const pct = poll.total ? Math.round(((o.votos || 0) / poll.total) * 100) : 0;
        const cls = ["bd-poll-res", o.id === poll.meu_voto ? "is-mine" : "", poll.total && o.votos === max ? "is-top" : ""].filter(Boolean).join(" ");
        return `<li class="${cls}"><span class="bd-poll-label">${escapeHtml(o.label)}${o.id === poll.meu_voto ? ' <span class="bd-poll-mine">✓ seu voto</span>' : ""}</span><span class="bd-poll-barline"><span class="bd-poll-bar" aria-hidden="true">${asciiBar(pct)}</span> <span class="bd-poll-pct">${pct}%</span> <span class="bd-poll-n">(${o.votos || 0})</span></span></li>`;
      })
      .join("")}</ol>`;
  } else {
    main = `<form class="bd-poll-form" data-enquete-form><fieldset${poll.pode_votar ? "" : " disabled"}><legend class="bd-sr">Escolha uma opção</legend>${poll.opcoes
      .map((o) => `<label class="bd-poll-opt"><input type="radio" name="opcao" value="${escapeHtml(o.id)}"> <span>${escapeHtml(o.label)}</span></label>`)
      .join("")}<button type="submit" class="bd-poll-votar">Votar</button></fieldset></form>`;
  }
  let note = "";
  if (poll.previa === "autor") note = "Prévia: você é o autor; o resultado aparece para os outros depois que votam ou quando encerrar.";
  else if (poll.previa === "adm") note = "Prévia de ADM: o resultado aparece para os outros depois que votam ou quando encerrar.";
  const motivo = poll.motivo && poll.motivo.motivo !== "encerrada" ? poll.motivo.texto : "";
  const hint = !poll.mostra_resultado ? "O resultado aparece depois que você vota ou quando a enquete encerrar." : "";
  const notes = [motivo, note, hint].filter(Boolean).map((t) => `<p class="bd-poll-note">${escapeHtml(t)}</p>`).join("");
  return `<section class="bd-poll" data-enquete="${escapeHtml(poll.post_id)}" aria-label="Enquete">${head}${main}${notes}<p class="bd-poll-status" role="status" data-enquete-status></p></section>`;
}
