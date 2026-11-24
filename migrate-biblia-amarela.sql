-- Bíblia Amarela editável por ADMs do site (conteúdo semeado do HTML original de /s/biblia-amarela.html)
CREATE TABLE IF NOT EXISTS biblia_amarela_meta (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  titulo_capa TEXT NOT NULL,
  subtitulo TEXT NOT NULL DEFAULT '',
  intro TEXT NOT NULL DEFAULT '',
  fontes TEXT NOT NULL DEFAULT '',
  updated_at TEXT,
  updated_by_user_id TEXT,
  updated_by_username TEXT
);
CREATE TABLE IF NOT EXISTS biblia_amarela_books (
  id TEXT PRIMARY KEY,
  position INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  credito TEXT NOT NULL DEFAULT '',
  texto TEXT NOT NULL DEFAULT '',
  nota_pendente TEXT NOT NULL DEFAULT 'ainda não escrito',
  created_at TEXT NOT NULL,
  updated_at TEXT,
  updated_by_user_id TEXT,
  updated_by_username TEXT
);
CREATE INDEX IF NOT EXISTS idx_biblia_books_position ON biblia_amarela_books(position);
INSERT OR IGNORE INTO biblia_amarela_meta (id, titulo, titulo_capa, subtitulo, intro, fontes) VALUES ('main', 'A bíblia amarela', 'A Bíblia Amarela', 'Escritura based a orientação para a verdade, sabedoria e glória.', '"A biblia amarela" é um projeto textual satírico composto por uma série de livros a fim de promover críticas, sátiras e pontuações ao MBL/MISSÃO e seus livros de propostas entitulados de "livro amarelo". Originalmente hospedado na wiki do r/BrasilSocial e com seus fundamentos escritos por >>Intimorato. Que pretende atrair contribuidores para o projeto.', 'Fontes: [wiki da Bíblia Amarela](https://www.reddit.com/r/BrasilSocial/wiki/biblia-amarela/) · [Gênese do movimento](https://www.reddit.com/r/BrasilSocial/wiki/biblia-amarela/genese/)');
INSERT OR IGNORE INTO biblia_amarela_books (id, position, titulo, credito, texto, nota_pendente, created_at) VALUES ('genese', 10, 'Gênese do movimento', 'Texto da wiki do r/BrasilSocial, por >>Intimorato.', '## Capítulo I

No princípio era o Petê, que moldou o estado à sua imagem, fazendo tudo de ruim que não resolveram e também que ocasionaram ser culpa deles. Nesse tempo o Petê revolucionou a corrupção.

O Petê governava de acordo com que suas oferendas para a COLIGAÇÃO lhe permitia.

O Culto dos peteístas ao Petê era grande e inabalável, mas as desvenças estavam crescendo e um belo dia a oferenda incluía 20 centavos. A sensação de livre mobilidade popular se esvaiu.

Sobreveio o presságio de impeachment, a gestão de Dima Rostef entrou em crise, sob a liderança de Renã Satan surgiu o movimento cujo preceito é libertar os bestas e trazer á tona a besta interior de cada indivíduo.

## Movimento besta livre

**M. ême** = Me

**B. besta(s) =** be

**L. éli = li**

E viu o criador que o movimento era bom para toda sorte de enganar trouxas e sequestrar pautas. E se fez mister para o mebéli tomar frente na conclusão do impeachment ou pelo menos fazer presença que pudesse ser vendida como decisiva no processo.

Então se espetaculou uma caminhada até a capital para entregar o pedido de expulsão ao presidente da câmara de puteiros.

## Capítulo II

Entre pedaladas, jornadas juninas e jatos lavadores, o impeachment se consumou.', 'ainda não escrito na wiki', '2026-11-24T00:00:00.000Z');
INSERT OR IGNORE INTO biblia_amarela_books (id, position, titulo, credito, texto, nota_pendente, created_at) VALUES ('militancia', 20, 'Militancia', '', '', 'ainda não escrito na wiki', '2026-11-24T00:00:00.000Z');
INSERT OR IGNORE INTO biblia_amarela_books (id, position, titulo, credito, texto, nota_pendente, created_at) VALUES ('mister-partidario', 30, 'Mister partidario', '', '', 'ainda não escrito na wiki', '2026-11-24T00:00:00.000Z');
INSERT OR IGNORE INTO biblia_amarela_books (id, position, titulo, credito, texto, nota_pendente, created_at) VALUES ('hackeando-pessoas', 40, 'Hackeando pessoas', '', '', 'ainda não escrito na wiki', '2026-11-24T00:00:00.000Z');
INSERT OR IGNORE INTO biblia_amarela_books (id, position, titulo, credito, texto, nota_pendente, created_at) VALUES ('o-entulho', 50, 'O entulho', '', '', 'ainda não escrito na wiki', '2026-11-24T00:00:00.000Z');
INSERT OR IGNORE INTO biblia_amarela_books (id, position, titulo, credito, texto, nota_pendente, created_at) VALUES ('bostil', 60, 'Bostil', '', '', 'ainda não escrito na wiki', '2026-11-24T00:00:00.000Z');
