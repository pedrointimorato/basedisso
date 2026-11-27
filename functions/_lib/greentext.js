// MOR-40: greentext (estilo chan) na hora de mostrar — o texto guardado não muda.
// Linha que começa com ">" (espaços/tab antes também contam) fica verde, menos ">>Nome" / ">>123"
// (menções e citações: ">>" seguido de letra, número ou _). Mesmas regras de /account.js (appendGreen).
export const GREEN_RE = /^[ \t]*>(?!>[A-Za-z0-9_])/;

export function isGreenLine(line) {
  return GREEN_RE.test(String(line || ""));
}

// Texto → HTML escapado, linha a linha; linhas verdes num <span class="bd-green">. Nada do texto vira HTML.
export function greenHtml(text, esc) {
  return String(text == null ? "" : text)
    .split(/\r?\n/)
    .map((line) => (line && isGreenLine(line) ? `<span class="bd-green">${esc(line)}</span>` : esc(line)))
    .join("\n");
}
