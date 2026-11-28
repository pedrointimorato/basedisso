// Bíblia Amarela: conteúdo padrão (idêntico ao HTML estático de /l/biblia-amarela.html) + leitura/escrita no D1.
// Formato do texto (renderizado com escape no navegador, sem HTML cru):
//   parágrafos separados por linha em branco · "## Título" / "### Subtítulo" · "> citação" · "- item"
//   **negrito** · *itálico* · [texto](https://link) · >>Nome (menção)
export const BIBLIA_DEFAULT = {
  meta: {
    titulo: "A bíblia amarela",
    titulo_capa: "A Bíblia Amarela",
    subtitulo: "Escritura based a orientação para a verdade, sabedoria e glória.",
    intro:
      '"A biblia amarela" é um projeto textual satírico composto por uma série de livros a fim de promover críticas, sátiras e pontuações ao MBL/MISSÃO e seus livros de propostas entitulados de "livro amarelo". Originalmente hospedado na wiki do r/BrasilSocial e com seus fundamentos escritos por >>Intimorato. Que pretende atrair contribuidores para o projeto.',
    fontes:
      "Fontes: [wiki da Bíblia Amarela](https://www.reddit.com/r/BrasilSocial/wiki/biblia-amarela/) · [Gênese do movimento](https://www.reddit.com/r/BrasilSocial/wiki/biblia-amarela/genese/)",
  },
  livros: [
    {
      id: "genese",
      titulo: "Gênese do movimento",
      credito: "Texto da wiki do r/BrasilSocial, por >>Intimorato.",
      texto: [
        "## Capítulo I",
        "No princípio era o Petê, que moldou o estado à sua imagem, fazendo tudo de ruim que não resolveram e também que ocasionaram ser culpa deles. Nesse tempo o Petê revolucionou a corrupção.",
        "O Petê governava de acordo com que suas oferendas para a COLIGAÇÃO lhe permitia.",
        "O Culto dos peteístas ao Petê era grande e inabalável, mas as desvenças estavam crescendo e um belo dia a oferenda incluía 20 centavos. A sensação de livre mobilidade popular se esvaiu.",
        "Sobreveio o presságio de impeachment, a gestão de Dima Rostef entrou em crise, sob a liderança de Renã Satan surgiu o movimento cujo preceito é libertar os bestas e trazer á tona a besta interior de cada indivíduo.",
        "## Movimento besta livre",
        "**M. ême** = Me",
        "**B. besta(s) =** be",
        "**L. éli = li**",
        "E viu o criador que o movimento era bom para toda sorte de enganar trouxas e sequestrar pautas. E se fez mister para o mebéli tomar frente na conclusão do impeachment ou pelo menos fazer presença que pudesse ser vendida como decisiva no processo.",
        "Então se espetaculou uma caminhada até a capital para entregar o pedido de expulsão ao presidente da câmara de puteiros.",
        "## Capítulo II",
        "Entre pedaladas, jornadas juninas e jatos lavadores, o impeachment se consumou.",
      ].join("\n\n"),
      nota_pendente: "ainda não escrito na wiki",
    },
    { id: "militancia", titulo: "Militancia", credito: "", texto: "", nota_pendente: "ainda não escrito na wiki" },
    { id: "mister-partidario", titulo: "Mister partidario", credito: "", texto: "", nota_pendente: "ainda não escrito na wiki" },
    { id: "hackeando-pessoas", titulo: "Hackeando pessoas", credito: "", texto: "", nota_pendente: "ainda não escrito na wiki" },
    { id: "o-entulho", titulo: "O entulho", credito: "", texto: "", nota_pendente: "ainda não escrito na wiki" },
    { id: "bostil", titulo: "Bostil", credito: "", texto: "", nota_pendente: "ainda não escrito na wiki" },
  ],
};

export const LIMITS = { titulo: 120, titulo_capa: 80, subtitulo: 240, intro: 8000, fontes: 2000, credito: 400, texto: 120000, nota_pendente: 120, livros: 60 };

function clean(raw, max, { multiline = false } = {}) {
  let s = String(raw ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  if (!multiline) s = s.replace(/\n+/g, " ");
  s = s.replace(/[ \t]+$/gm, "").trim();
  if (multiline) s = s.replace(/\n{3,}/g, "\n\n");
  if (s.length > max) return { erro: true };
  return { v: s };
}

export function cleanMetaInput(d) {
  const out = {};
  const spec = { titulo: [LIMITS.titulo, false, true], titulo_capa: [LIMITS.titulo_capa, false, true], subtitulo: [LIMITS.subtitulo, false, false], intro: [LIMITS.intro, true, false], fontes: [LIMITS.fontes, true, false] };
  for (const [k, [max, ml, req]] of Object.entries(spec)) {
    const c = clean(d?.[k], max, { multiline: ml });
    if (c.erro) return { erro: `"${k}" passou do limite de ${max} caracteres.` };
    if (req && !c.v) return { erro: k === "titulo" ? "O título não pode ficar vazio." : "O título da capa não pode ficar vazio." };
    out[k] = c.v;
  }
  return out;
}

export function cleanLivroInput(d) {
  const out = {};
  const spec = { titulo: [LIMITS.titulo, false], credito: [LIMITS.credito, false], texto: [LIMITS.texto, true], nota_pendente: [LIMITS.nota_pendente, false] };
  for (const [k, [max, ml]] of Object.entries(spec)) {
    const c = clean(d?.[k], max, { multiline: ml });
    if (c.erro) return { erro: `"${k}" passou do limite de ${max} caracteres.` };
    out[k] = c.v;
  }
  if (!out.titulo) return { erro: "O livro precisa de um título." };
  if (!out.nota_pendente) out.nota_pendente = "ainda não escrito";
  return out;
}

export function slugify(s) {
  return String(s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "livro";
}

export async function readBiblia(db) {
  let meta = null, livros = null;
  try {
    meta = await db.prepare("SELECT titulo, titulo_capa, subtitulo, intro, fontes, updated_at, updated_by_username FROM biblia_amarela_meta WHERE id = 'main'").first();
    const r = await db.prepare("SELECT id, position, titulo, credito, texto, nota_pendente, updated_at, updated_by_username FROM biblia_amarela_books ORDER BY position, created_at").all();
    livros = r.results || [];
  } catch {
    meta = null; livros = null;
  }
  if (!meta || !livros) {
    return { origem: "padrao", meta: { ...BIBLIA_DEFAULT.meta }, livros: BIBLIA_DEFAULT.livros.map((l) => ({ ...l })), editado: null };
  }
  // Última edição = a mais recente entre cabeçalho e livros.
  let editado = meta.updated_at && meta.updated_by_username ? { em: meta.updated_at, por: meta.updated_by_username } : null;
  for (const l of livros) {
    if (l.updated_at && l.updated_by_username && (!editado || l.updated_at > editado.em)) editado = { em: l.updated_at, por: l.updated_by_username };
  }
  return {
    origem: "d1",
    meta: { titulo: meta.titulo, titulo_capa: meta.titulo_capa, subtitulo: meta.subtitulo || "", intro: meta.intro || "", fontes: meta.fontes || "", editado: meta.updated_by_username ? { em: meta.updated_at, por: meta.updated_by_username } : null },
    livros: livros.map((l) => ({
      id: l.id, titulo: l.titulo, credito: l.credito || "", texto: l.texto || "", nota_pendente: l.nota_pendente || "ainda não escrito",
      editado: l.updated_by_username ? { em: l.updated_at, por: l.updated_by_username } : null,
    })),
    editado,
  };
}

// Garante que as linhas padrão existam (caso a migração não tenha semeado).
export async function ensureSeed(db) {
  const now = new Date().toISOString();
  const m = BIBLIA_DEFAULT.meta;
  const stmts = [
    db.prepare("INSERT OR IGNORE INTO biblia_amarela_meta (id, titulo, titulo_capa, subtitulo, intro, fontes, updated_at, updated_by_user_id, updated_by_username) VALUES ('main', ?, ?, ?, ?, ?, NULL, NULL, NULL)")
      .bind(m.titulo, m.titulo_capa, m.subtitulo, m.intro, m.fontes),
  ];
  const has = await db.prepare("SELECT COUNT(*) AS n FROM biblia_amarela_books").first();
  if (!has || Number(has.n) === 0) {
    BIBLIA_DEFAULT.livros.forEach((l, i) => {
      stmts.push(db.prepare("INSERT OR IGNORE INTO biblia_amarela_books (id, position, titulo, credito, texto, nota_pendente, created_at, updated_at, updated_by_user_id, updated_by_username) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL)")
        .bind(l.id, (i + 1) * 10, l.titulo, l.credito, l.texto, l.nota_pendente, now));
    });
  }
  await db.batch(stmts);
}

export function editorOf(ctx) {
  return { id: ctx.user ? ctx.user.id : "token", username: ctx.user ? ctx.user.username : "ADM" };
}
