// Arte ASCII do perfil: limpeza e validação (espelhada em /perfil.js).
export const ASCII_MAX_LINES = 16;
export const ASCII_MAX_COLS = 48;
export const ASCII_RAW_MAX = 4000;
export const ASCII_FRAMES = ["simples", "nenhuma"];
// Avatar ASCII: espaço pequeno, como uma foto de perfil.
export const AVATAR_MAX_LINES = 8;
export const AVATAR_MAX_COLS = 16;
export const AVATAR_LIMITS = { lines: AVATAR_MAX_LINES, cols: AVATAR_MAX_COLS };

// Controles (menos \n), invisíveis de largura zero e marcadores de direção.
const STRIP_RE = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u00AD\u200B-\u200F\u2028\u2029\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\uFFF9-\uFFFB]/gu;
const MARK_RE = /\p{M}/gu;
// Caracteres que ocupam 2 colunas ou largura imprevisível (quebram o alinhamento).
const WIDE_RE = /[\p{Extended_Pictographic}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\u3000-\u303F\uFF00-\uFF60\uFFE0-\uFFE6\u{1F000}-\u{1FAFF}\uFE0F]/u;

export function cleanAsciiArt(raw, limits = {}) {
  const maxLines = limits.lines || ASCII_MAX_LINES;
  const maxCols = limits.cols || ASCII_MAX_COLS;
  let s = String(raw ?? "");
  if (s.length > ASCII_RAW_MAX) return { erro: "Arte grande demais." };
  s = s.replace(/\r\n?/g, "\n").replace(/\t/g, "    ");
  try { s = s.normalize("NFC"); } catch { /* ok */ }
  s = s.replace(STRIP_RE, "").replace(MARK_RE, "");
  if (WIDE_RE.test(s)) {
    return { erro: "Emojis e caracteres largos (chinês, japonês, coreano) não são aceitos: eles quebram o alinhamento." };
  }
  let lines = s.split("\n").map((l) => l.replace(/\s+$/u, ""));
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  while (lines.length && lines[0] === "") lines.shift();
  if (!lines.length) return { erro: "A arte está vazia." };
  if (lines.length > maxLines) {
    return { erro: `Máximo de ${maxLines} linhas (a arte tem ${lines.length}).` };
  }
  let cols = 0;
  for (let i = 0; i < lines.length; i++) {
    const n = Array.from(lines[i]).length;
    if (n > maxCols) {
      return { erro: `A linha ${i + 1} tem ${n} colunas; o máximo é ${maxCols}.` };
    }
    if (n > cols) cols = n;
  }
  return { arte: lines.join("\n"), linhas: lines.length, colunas: cols };
}

export function cleanFrame(raw) {
  const f = String(raw ?? "simples").trim().toLowerCase();
  return ASCII_FRAMES.includes(f) ? f : null;
}

export function asciiOut(row) {
  if (!row || !row.art) return null;
  return { arte: row.art, moldura: row.frame === "nenhuma" ? "nenhuma" : "simples", atualizada_em: row.updated_at || null };
}

export async function readAscii(db, userId) {
  try {
    const row = await db.prepare("SELECT art, frame, updated_at FROM profile_ascii WHERE user_id = ?").bind(userId).first();
    return asciiOut(row);
  } catch {
    return null; // tabela ausente em ambiente local
  }
}

export async function readAvatar(db, userId) {
  if (!userId) return null;
  try {
    const row = await db.prepare("SELECT art, updated_at FROM profile_avatar WHERE user_id = ?").bind(userId).first();
    return row && row.art ? { arte: row.art, atualizada_em: row.updated_at || null } : null;
  } catch {
    return null;
  }
}
