// Markdown simples da wiki (MOR-46). Feito à mão para a wiki: NADA do texto vira HTML cru.
// Tudo é escapado; só as marcações abaixo geram tags, e links só aceitam http(s), caminhos do site, #âncora e mailto.
//
// Blocos:   ## título (## ### ####) · parágrafos · listas (- ou 1.) com subníveis por indentação · tabelas | a | b |
//           ``` código ``` · --- linha · ::: nota / importante / faq / demo ... ::: · [[cartoes]] (só na página inicial)
// Em linha: **negrito** · *itálico* · ***os dois*** · `código` · [texto](endereço) · \* escapa o caractere
import { GREEN_RE } from "./greentext.js";

export function esc(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Mesmo esquema do Python-Markdown (as âncoras antigas continuam valendo).
export function slugify(text) {
  let s = String(text || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/[^\w\s-]/g, "").trim().toLowerCase();
  s = s.replace(/[-\s]+/g, "-");
  return s || "secao";
}

const SAFE_URL = /^(https?:\/\/[^\s<>"'`]+|\/(?!\/)[^\s<>"'`]*|#[^\s<>"'`]*|mailto:[^\s<>"'`]+)$/i;

export function safeUrl(u) {
  const s = String(u || "").trim();
  return SAFE_URL.test(s) ? s : null;
}

function linkHtml(url, innerHtml) {
  const external = /^https?:/i.test(url);
  const attrs = external ? ' rel="noopener noreferrer nofollow ugc" target="_blank"' : "";
  return `<a href="${esc(url)}"${attrs}>${innerHtml}</a>`;
}

function inlineRaw(src, holds) {
  let s = String(src);
  const hold = (h) => {
    holds.push(h);
    return "\u0000" + (holds.length - 1) + "\u0000";
  };
  s = s.replace(/\u0000/g, "");
  s = s.replace(/\\([\\`*\[\]()#>|_\-.!<{}+~])/g, (_, c) => hold(esc(c)));
  s = s.replace(/(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/g, (_, __, code) => hold(`<code>${esc(code.trim())}</code>`));
  s = s.replace(/\[([^\]\n]+)\]\(\s*([^)\s]+)\s*\)/g, (m, text, url) => {
    const u = safeUrl(url);
    if (!u) return m;
    return hold(linkHtml(u, inlineRaw(text, holds)));
  });
  s = esc(s);
  s = s.replace(/\*\*\*(?=\S)([^*]*?\S)\*\*\*/g, "<strong><em>$1</em></strong>");
  s = s.replace(/\*\*(?=\S)(.+?\S)\*\*(?!\*)/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*\w])\*(?=[^\s*])([^*\n]*?[^\s*])\*(?!\*)/g, "$1<em>$2</em>");
  return s;
}

export function inline(src) {
  const holds = [];
  let out = inlineRaw(src, holds);
  for (let k = 0; k < 6 && /\u0000\d+\u0000/.test(out); k++) {
    out = out.replace(/\u0000(\d+)\u0000/g, (_, i) => holds[Number(i)] || "");
  }
  return out.replace(/\u0000/g, "");
}

function plainOfInline(src) {
  return String(src)
    .replace(/\[([^\]\n]+)\]\([^)\s]+\)/g, "$1")
    .replace(/`+/g, "")
    .replace(/\\([\\`*\[\]()#>|_\-.!<{}+~])/g, "$1")
    .replace(/\*+/g, "");
}

const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const HEAD_RE = /^(#{1,4})\s+(.+?)\s*#*\s*$/;
const FENCE_RE = /^\s*```/;
const CONT_OPEN_RE = /^:::\s*(nota|importante|faq|demo)\s*$/;
const CONT_CLOSE_RE = /^:::\s*$/;
const HR_RE = /^\s*(-{3,}|\*{3,})\s*$/;
const TABLE_SEP_RE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function splitRow(line) {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  const cells = [];
  let cur = "";
  let inCode = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "\\" && s[i + 1] === "|") { cur += "|"; i++; continue; }
    if (c === "`") inCode = !inCode;
    if (c === "|" && !inCode) { cells.push(cur.trim()); cur = ""; continue; }
    cur += c;
  }
  cells.push(cur.trim());
  return cells;
}

function isBlockStart(line, next) {
  return (
    HEAD_RE.test(line) || FENCE_RE.test(line) || CONT_OPEN_RE.test(line) || HR_RE.test(line) ||
    LIST_RE.test(line) || /^\[\[cartoes\]\]\s*$/.test(line) ||
    (/^\s*\|/.test(line) && next != null && TABLE_SEP_RE.test(next))
  );
}

function renderGreen(text) {
  return String(text)
    .split("\n")
    .map((l) => (l && GREEN_RE.test(l) ? `<span class="bd-green">${esc(l)}</span>` : esc(l)))
    .join("\n");
}

// opts.cartoes: HTML dos cartões (substitui a linha [[cartoes]]).
export function renderMarkdown(src, opts = {}) {
  const text = String(src == null ? "" : src).replace(/\r\n?/g, "\n").replace(/\t/g, "    ");
  const headings = [];
  const used = new Set();
  const uniqueId = (base) => {
    let id = base;
    for (let n = 1; used.has(id); n++) id = `${base}_${n}`;
    used.add(id);
    return id;
  };

  function parseList(lines, start, indent) {
    let i = start;
    const first = lines[i].match(LIST_RE);
    const ordered = /\d/.test(first[2]);
    const items = [];
    while (i < lines.length) {
      const m = lines[i].match(LIST_RE);
      if (!m || m[1].length !== indent || /\d/.test(m[2]) !== ordered) break;
      const item = { text: m[3], nested: [] };
      i++;
      while (i < lines.length) {
        const l = lines[i];
        if (!l.trim()) {
          let j = i + 1;
          while (j < lines.length && !lines[j].trim()) j++;
          if (j < lines.length && LIST_RE.test(lines[j]) && lines[j].match(LIST_RE)[1].length >= indent) { i = j; continue; }
          break;
        }
        const lm = l.match(LIST_RE);
        const ind = l.length - l.trimStart().length;
        if (lm && ind > indent) {
          const sub = parseList(lines, i, ind);
          item.nested.push(sub.html);
          i = sub.next;
          continue;
        }
        if (lm && ind <= indent) break;
        if (ind > indent) { item.text += " " + l.trim(); i++; continue; }
        break;
      }
      items.push(item);
    }
    const tag = ordered ? "ol" : "ul";
    const html = `<${tag}>\n` + items.map((it) => `<li>${inline(it.text)}${it.nested.length ? "\n" + it.nested.join("\n") + "\n" : ""}</li>`).join("\n") + `\n</${tag}>`;
    return { html, next: i };
  }

  function parseBlocks(lines) {
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }

      if (FENCE_RE.test(line)) {
        const buf = [];
        i++;
        while (i < lines.length && !FENCE_RE.test(lines[i])) buf.push(lines[i++]);
        i++;
        out.push(`<pre><code>${esc(buf.join("\n"))}</code></pre>`);
        continue;
      }

      const co = line.match(CONT_OPEN_RE);
      if (co) {
        const kind = co[1];
        const buf = [];
        let depth = 1;
        i++;
        while (i < lines.length) {
          if (kind !== "demo" && CONT_OPEN_RE.test(lines[i])) depth++;
          else if (CONT_CLOSE_RE.test(lines[i])) { depth--; if (depth === 0) break; }
          buf.push(lines[i]);
          i++;
        }
        i++;
        if (kind === "demo") out.push(`<pre class="wiki-demo">${renderGreen(buf.join("\n").replace(/^\n+|\n+$/g, ""))}</pre>`);
        else {
          const cls = kind === "faq" ? "wiki-faq" : kind === "importante" ? "wiki-nota importante" : "wiki-nota";
          out.push(`<div class="${cls}">\n${parseBlocks(buf)}\n</div>`);
        }
        continue;
      }

      if (/^\[\[cartoes\]\]\s*$/.test(line)) { out.push(opts.cartoes || ""); i++; continue; }

      const hm = line.match(HEAD_RE);
      if (hm) {
        const level = Math.max(2, hm[1].length);
        const plain = plainOfInline(hm[2]);
        const id = uniqueId(slugify(plain));
        headings.push({ level, text: plain, id });
        out.push(`<h${level} id="${esc(id)}">${inline(hm[2])}</h${level}>`);
        i++;
        continue;
      }

      if (HR_RE.test(line)) { out.push("<hr>"); i++; continue; }

      if (/^\s*\|/.test(line) && i + 1 < lines.length && TABLE_SEP_RE.test(lines[i + 1])) {
        const head = splitRow(line);
        i += 2;
        const rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(splitRow(lines[i++]));
        const th = head.map((c) => `<th>${inline(c)}</th>`).join("");
        const tb = rows.map((r) => "<tr>" + head.map((_, k) => `<td>${inline(r[k] || "")}</td>`).join("") + "</tr>").join("\n");
        out.push(`<div class="wiki-tabela"><table>\n<thead><tr>${th}</tr></thead>\n<tbody>\n${tb}\n</tbody>\n</table></div>`);
        continue;
      }

      const lm = line.match(LIST_RE);
      if (lm) {
        const r = parseList(lines, i, lm[1].length);
        out.push(r.html);
        i = r.next;
        continue;
      }

      const buf = [line.trim()];
      i++;
      while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i], lines[i + 1])) buf.push(lines[i++].trim());
      out.push(`<p>${inline(buf.join("\n"))}</p>`);
    }
    return out.join("\n");
  }

  const html = parseBlocks(text.split("\n"));
  return { html, headings };
}

export function plainText(html) {
  return String(html || "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// Seções (## ...) para a busca: [{ id, titulo, texto }]
export function sectionsOf(html) {
  const parts = String(html || "").split(/(?=<h2 id=")/);
  const out = [];
  for (const p of parts) {
    const m = p.match(/^<h2 id="([^"]+)">([\s\S]*?)<\/h2>/);
    if (!m) continue;
    out.push({ id: m[1], titulo: plainText(m[2]), texto: plainText(p) });
  }
  return out;
}

// Diff por linhas (para o histórico). Devolve [{ t: "=" | "+" | "-", s }] ou null se for grande demais.
export function lineDiff(a, b) {
  const A = String(a || "").split("\n");
  const B = String(b || "").split("\n");
  let pre = 0;
  while (pre < A.length && pre < B.length && A[pre] === B[pre]) pre++;
  let suf = 0;
  while (suf < A.length - pre && suf < B.length - pre && A[A.length - 1 - suf] === B[B.length - 1 - suf]) suf++;
  const a2 = A.slice(pre, A.length - suf);
  const b2 = B.slice(pre, B.length - suf);
  if (a2.length * b2.length > 4_000_000) return null;
  const n = a2.length, m = b2.length;
  const w = m + 1;
  const dp = new Uint16Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i * w + j] = a2[i] === b2[j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
    }
  }
  const ops = [];
  for (let k = 0; k < pre; k++) ops.push({ t: "=", s: A[k] });
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a2[i] === b2[j]) { ops.push({ t: "=", s: a2[i] }); i++; j++; }
    else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) ops.push({ t: "-", s: a2[i++] });
    else ops.push({ t: "+", s: b2[j++] });
  }
  while (i < n) ops.push({ t: "-", s: a2[i++] });
  while (j < m) ops.push({ t: "+", s: b2[j++] });
  for (let k = A.length - suf; k < A.length; k++) ops.push({ t: "=", s: A[k] });
  return ops;
}
