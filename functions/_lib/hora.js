import { escapeHtml } from "./shared.js";

// Data/hora em HTML do servidor: <time datetime="ISO" data-hora-local> com texto em UTC
// (funciona sem JS); /hora-local.js reescreve para o fuso do dispositivo de quem lê.
function pad(n) {
  return String(n).padStart(2, "0");
}

export function utcFallbackText(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso || "");
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
}

export function localTimeHtml(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return escapeHtml(String(iso));
  const dt = escapeHtml(d.toISOString());
  return `<time datetime="${dt}" data-hora-local title="${escapeHtml(utcFallbackText(iso))}">${escapeHtml(utcFallbackText(iso))}</time>`;
}
