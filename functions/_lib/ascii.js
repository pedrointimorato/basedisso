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

// ---------- Cores por caractere ----------
// Máscara: mesmo formato da arte (linhas separadas por \n), um código por caractere.
// '.' = cor padrão do tema; '1'..'8' = paleta abaixo (classes .ac-1..ac-8, uma variante por tema no CSS).
export const ASCII_PALETTE = ["vermelho", "laranja", "amarelo", "verde", "ciano", "azul", "roxo", "cinza"];
const MASK_LINE_RE = /^[.1-8]*$/;

// Alinha a máscara à arte já limpa. Comprimentos diferentes são corrigidos (completa com '.', corta o excesso);
// códigos fora da paleta são rejeitados. Espaços nunca têm cor. Máscara toda '.' vira null.
export function cleanColorMask(raw, arte) {
  if (raw == null || raw === "") return { cores: null };
  if (typeof raw !== "string" || raw.length > ASCII_RAW_MAX) return { erro: "Cores inválidas." };
  const maskLines = raw.replace(/\r\n?/g, "\n").split("\n");
  for (const l of maskLines) {
    if (!MASK_LINE_RE.test(l)) return { erro: "Cores inválidas: use só as cores da paleta." };
  }
  const artLines = String(arte || "").split("\n");
  let any = false;
  const out = artLines.map((line, i) => {
    const chars = Array.from(line);
    const m = maskLines[i] || "";
    let r = "";
    for (let j = 0; j < chars.length; j++) {
      const c = /\s/u.test(chars[j]) ? "." : m[j] || ".";
      if (c !== ".") any = true;
      r += c;
    }
    return r;
  });
  return { cores: any ? out.join("\n") : null };
}

// Máscara já guardada → alinhada (defensivo, caso a arte mude por fora).
export function maskFor(arte, colors) {
  if (!colors) return null;
  const c = cleanColorMask(colors, arte);
  return c.erro ? null : c.cores;
}

// HTML escapado com <span class="ac-N"> por sequência de mesma cor (não um span por caractere).
// O texto passa sempre por escape; a classe vem só de '1'..'8'.
export function coloredHtml(arte, colors, esc) {
  const mask = maskFor(arte, colors);
  const lines = String(arte || "").split("\n");
  if (!mask) return esc(String(arte || ""));
  const ml = mask.split("\n");
  return lines.map((line, i) => {
    const chars = Array.from(line);
    const m = ml[i] || "";
    let html = "", run = "", cur = ".";
    const flush = () => { if (!run) return; html += cur === "." ? esc(run) : `<span class="ac-${cur}">${esc(run)}</span>`; run = ""; };
    for (let j = 0; j < chars.length; j++) {
      const c = m[j] || ".";
      if (c !== cur) { flush(); cur = c; }
      run += chars[j];
    }
    flush();
    return html;
  }).join("\n");
}

export function asciiOut(row) {
  if (!row || !row.art) return null;
  return { arte: row.art, cores: maskFor(row.art, row.colors), moldura: row.frame === "nenhuma" ? "nenhuma" : "simples", atualizada_em: row.updated_at || null };
}

export async function readAscii(db, userId) {
  try {
    const row = await db.prepare("SELECT art, colors, frame, updated_at FROM profile_ascii WHERE user_id = ?").bind(userId).first();
    return asciiOut(row);
  } catch {
    return null; // tabela ausente em ambiente local
  }
}

export async function readAvatar(db, userId) {
  if (!userId) return null;
  try {
    const row = await db.prepare("SELECT art, colors, updated_at FROM profile_avatar WHERE user_id = ?").bind(userId).first();
    return row && row.art ? { arte: row.art, cores: maskFor(row.art, row.colors), atualizada_em: row.updated_at || null } : null;
  } catch {
    return null;
  }
}

// ---------- Camadas (até 4) ----------
// Cada camada: texto + máscara de cores, alinhados por posição (linhas vazias no topo contam).
// Composição de cima para baixo: um caractere que não é espaço numa camada de cima cobre o de baixo;
// espaços são transparentes. Camadas ocultas são guardadas, mas não entram na composição.
// art/colors continuam sendo o resultado composto (o que todo o resto do site lê).
export const LAYERS_MAX = 4;

export function cleanLayerText(raw, limits = {}) {
  const maxLines = limits.lines || ASCII_MAX_LINES;
  const maxCols = limits.cols || ASCII_MAX_COLS;
  if (raw != null && typeof raw !== "string") return { erro: "Camada inválida." };
  let s = String(raw ?? "");
  if (s.length > ASCII_RAW_MAX) return { erro: "Camada grande demais." };
  s = s.replace(/\r\n?/g, "\n").replace(/\t/g, "    ");
  try { s = s.normalize("NFC"); } catch { /* ok */ }
  s = s.replace(STRIP_RE, "").replace(MARK_RE, "");
  if (WIDE_RE.test(s)) return { erro: "Emojis e caracteres largos (chinês, japonês, coreano) não são aceitos: eles quebram o alinhamento." };
  const lines = s.split("\n").map((l) => l.replace(/\s+$/u, ""));
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  if (lines.length > maxLines) return { erro: `máximo de ${maxLines} linhas (tem ${lines.length}).` };
  for (let i = 0; i < lines.length; i++) {
    const n = Array.from(lines[i]).length;
    if (n > maxCols) return { erro: `a linha ${i + 1} tem ${n} colunas; o máximo é ${maxCols}.` };
  }
  return { arte: lines.join("\n") };
}

// layers: [{ arte, cores }] de baixo para cima (só as visíveis). Devolve { arte, cores } já aparados.
export function compositeLayers(layers) {
  const L = layers.map((l) => {
    const lines = String(l.arte || "").split("\n").map((x) => Array.from(x));
    const ml = String(l.cores || "").split("\n");
    return { lines, ml };
  });
  const rows = Math.max(0, ...L.map((l) => (l.lines.length === 1 && !l.lines[0].length ? 0 : l.lines.length)));
  let art = [], mask = [];
  for (let r = 0; r < rows; r++) {
    const w = Math.max(0, ...L.map((l) => (l.lines[r] ? l.lines[r].length : 0)));
    let a = "", m = "";
    for (let c = 0; c < w; c++) {
      let ch = " ", code = ".";
      for (let k = L.length - 1; k >= 0; k--) {
        const x = L[k].lines[r] && L[k].lines[r][c];
        if (x != null && !/\s/u.test(x)) { ch = x; const mc = (L[k].ml[r] || "")[c]; code = mc && /[1-8]/.test(mc) ? mc : "."; break; }
      }
      a += ch; m += code;
    }
    const t = a.replace(/\s+$/u, ""); const n = Array.from(t).length;
    art.push(t); mask.push(m.slice(0, n));
  }
  while (art.length && art[art.length - 1] === "") { art.pop(); mask.pop(); }
  while (art.length && art[0] === "") { art.shift(); mask.shift(); }
  const any = mask.some((x) => /[1-8]/.test(x));
  return { arte: art.join("\n"), cores: any ? mask.join("\n") : null };
}

// Valida o pedido (camadas ou o formato antigo arte/cores) e recalcula a composição no servidor.
// Devolve { arte, cores, camadas (JSON ou null) } ou { erro }.
export function cleanLayeredInput(data, limits = {}) {
  if (data && data.camadas !== undefined) {
    if (!Array.isArray(data.camadas)) return { erro: "Camadas inválidas." };
    if (!data.camadas.length) return { erro: "Envie ao menos uma camada." };
    if (data.camadas.length > LAYERS_MAX) return { erro: `Máximo de ${LAYERS_MAX} camadas.` };
    const out = [];
    for (let i = 0; i < data.camadas.length; i++) {
      const l = data.camadas[i];
      if (!l || typeof l !== "object" || Array.isArray(l)) return { erro: `Camada ${i + 1}: inválida.` };
      if (l.visivel !== undefined && typeof l.visivel !== "boolean") return { erro: `Camada ${i + 1}: visibilidade inválida.` };
      const t = cleanLayerText(l.arte, limits);
      if (t.erro) return { erro: `Camada ${i + 1}: ${t.erro}` };
      const cm = cleanColorMask(l.cores, t.arte);
      if (cm.erro) return { erro: `Camada ${i + 1}: ${cm.erro}` };
      out.push({ arte: t.arte, cores: cm.cores, visivel: l.visivel !== false });
    }
    const comp = compositeLayers(out.filter((l) => l.visivel));
    if (!comp.arte) return { erro: "A arte está vazia (todas as camadas visíveis estão em branco ou ocultas)." };
    const c = cleanAsciiArt(comp.arte, limits);
    if (c.erro) return { erro: c.erro };
    const cm = cleanColorMask(comp.cores, c.arte);
    if (cm.erro) return { erro: cm.erro };
    return { arte: c.arte, cores: cm.cores, camadas: JSON.stringify(out) };
  }
  if (!data || typeof data.arte !== "string") return { erro: "Envie a arte como texto." };
  const c = cleanAsciiArt(data.arte, limits);
  if (c.erro) return { erro: c.erro };
  const cm = cleanColorMask(data.cores, c.arte);
  if (cm.erro) return { erro: cm.erro };
  return { arte: c.arte, cores: cm.cores, camadas: null };
}

// Camadas guardadas → lista para o editor; sem camadas (artes antigas) = uma camada só, igual à arte.
export function layersOut(row) {
  if (!row || !row.art) return null;
  if (row.layers) {
    try {
      const l = JSON.parse(row.layers);
      if (Array.isArray(l) && l.length && l.length <= LAYERS_MAX) return l.map((x) => ({ arte: String(x.arte || ""), cores: x.cores || null, visivel: x.visivel !== false }));
    } catch { /* cai para uma camada */ }
  }
  return [{ arte: row.art, cores: maskFor(row.art, row.colors), visivel: true }];
}

export async function readLayers(db, table, userId) {
  if (table !== "profile_ascii" && table !== "profile_avatar") return null;
  try {
    const row = await db.prepare(`SELECT art, colors, layers FROM ${table} WHERE user_id = ?`).bind(userId).first();
    return layersOut(row);
  } catch {
    return null;
  }
}
