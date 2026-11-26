-- D1 schema for basedisso comments and user accounts
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  page TEXT NOT NULL,
  parent_id TEXT,
  name TEXT NOT NULL DEFAULT 'anônimo',
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0,
  ip_hash TEXT NOT NULL,
  user_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_comments_page_created ON comments(page, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at);
CREATE INDEX IF NOT EXISTS idx_comments_ip_created ON comments(ip_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);

CREATE TABLE IF NOT EXISTS rate_events (
  ip_hash TEXT NOT NULL,
  kind TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_events ON rate_events(ip_hash, kind, created_at);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  username_lc TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email TEXT,
  is_admin INTEGER NOT NULL DEFAULT 0,
  is_primordial INTEGER NOT NULL DEFAULT 0,
  primordial_n INTEGER,
  created_at TEXT NOT NULL,
  is_paid_primordial INTEGER NOT NULL DEFAULT 0,
  invited_by_code_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_users_username_lc ON users(username_lc);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_users_primordial ON users(primordial_n);

CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  username_lc TEXT NOT NULL,
  email TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  paid_at TEXT,
  claimed_at TEXT,
  user_id TEXT,
  primordial_n INTEGER,
  mp_preference_id TEXT,
  mp_payment_id TEXT,
  amount_centavos INTEGER NOT NULL DEFAULT 500,
  currency TEXT NOT NULL DEFAULT 'BRL',
  claim_token_hash TEXT,
  ip_hash TEXT
);
CREATE INDEX IF NOT EXISTS idx_reservations_username_lc ON reservations(username_lc);
CREATE INDEX IF NOT EXISTS idx_reservations_status_expires ON reservations(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_reservations_pref ON reservations(mp_preference_id);
CREATE INDEX IF NOT EXISTS idx_reservations_payment ON reservations(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_reservations_claim_hash ON reservations(claim_token_hash);

CREATE TABLE IF NOT EXISTS counters (
  name TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);
INSERT OR IGNORE INTO counters (name, value) VALUES ('primordial', 0);

CREATE TABLE IF NOT EXISTS communities (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  posting TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  created_by TEXT,
  subtitle TEXT,
  sidebar_text TEXT
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  community TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  link TEXT,
  name TEXT NOT NULL DEFAULT 'anônimo',
  user_id TEXT,
  created_at TEXT NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0,
  sticky INTEGER NOT NULL DEFAULT 0,
  ip_hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_posts_community_created ON posts(community, created_at);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_hidden_community ON posts(hidden, community);

INSERT OR IGNORE INTO communities (slug, name, description, posting, created_at) VALUES
  ('adm', 'adm', 'Solicitações, queixas, elogios, sugestões e ofertas ao administrador.', 'open', '2026-11-22T00:00:00.000Z'),
  ('atoa', 'À toa', 'Off topic. Conversa à toa, sem assunto definido.', 'open', '2026-11-23T00:00:00.000Z');

UPDATE comments SET page = '/b/adm' WHERE page = '/adm';

-- Hierarquia de ADMs e membros da base (idempotente, exceto o ALTER que só roda se a coluna faltar)
CREATE TABLE IF NOT EXISTS site_admins (
  user_id TEXT PRIMARY KEY,
  added_by TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS community_admins (
  community_slug TEXT NOT NULL,
  user_id TEXT NOT NULL,
  added_by TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (community_slug, user_id)
);
CREATE INDEX IF NOT EXISTS idx_community_admins_user ON community_admins(user_id);
CREATE TABLE IF NOT EXISTS base_members (
  user_id TEXT PRIMARY KEY,
  joined_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_base_members_joined ON base_members(joined_at);
-- ALTER TABLE communities ADD COLUMN created_by TEXT;  (aplicado uma vez)
INSERT OR IGNORE INTO site_admins (user_id, added_by, created_at)
  SELECT id, 'seed', '2026-11-23T00:00:00.000Z' FROM users WHERE username_lc = 'intimorato';
UPDATE users SET is_admin = 1 WHERE username_lc = 'intimorato';
INSERT OR IGNORE INTO community_admins (community_slug, user_id, added_by, created_at)
  SELECT 'adm', id, 'seed', '2026-11-23T00:00:00.000Z' FROM users WHERE username_lc = 'intimorato';
INSERT OR IGNORE INTO community_admins (community_slug, user_id, added_by, created_at)
  SELECT 'atoa', id, 'seed', '2026-11-23T00:00:00.000Z' FROM users WHERE username_lc = 'intimorato';

-- Membros por comunidade /b/<slug> (idempotente)
CREATE TABLE IF NOT EXISTS community_members (
  community_slug TEXT NOT NULL,
  user_id TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  PRIMARY KEY (community_slug, user_id)
);
CREATE INDEX IF NOT EXISTS idx_community_members_user ON community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_members_joined ON community_members(community_slug, joined_at);

-- Cartões editáveis: painel /b (site_cards) e cartão de cada /b/<slug> (communities.subtitle/sidebar_text)
CREATE TABLE IF NOT EXISTS site_cards (
  key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  body TEXT,
  updated_at TEXT,
  updated_by TEXT
);
INSERT OR IGNORE INTO site_cards (key, title, subtitle, body, updated_at, updated_by) VALUES
  ('b_panel', 'Comunidades', 'painel do basedisso', 'Um espaço para comunidades no estilo do fórum antigo. Entre em uma delas para ler e criar postagens.', '2026-11-24T00:00:00.000Z', 'seed');
-- Aplicado uma vez (verificando PRAGMA table_info(communities) antes):
-- ALTER TABLE communities ADD COLUMN subtitle TEXT;
-- ALTER TABLE communities ADD COLUMN sidebar_text TEXT;
UPDATE communities SET subtitle = 'solicitações · >>Intimorato',
  sidebar_text = 'Espaço para solicitações, queixas, elogios, sugestões ou ofertas. Qualquer pessoa pode criar uma postagem, anônima ou com nome.' || char(10) || char(10) || 'Deixe um comentário no aviso fixado ou me envie um e-mail: Intimorato@mail.ru'
  WHERE slug = 'adm' AND subtitle IS NULL AND sidebar_text IS NULL;
UPDATE communities SET subtitle = 'off topic · b/atoa',
  sidebar_text = 'Comunidade livre, sem assunto definido. Qualquer pessoa pode criar uma postagem, anônima ou com nome.'
  WHERE slug = 'atoa' AND subtitle IS NULL AND sidebar_text IS NULL;

-- Códigos de convite + caixas de acesso coletivo (idempotente, exceto os ALTER que só rodam se a coluna faltar)
-- Aplicado uma vez (verificando PRAGMA table_info(users) antes):
-- ALTER TABLE users ADD COLUMN is_paid_primordial INTEGER NOT NULL DEFAULT 0;
-- ALTER TABLE users ADD COLUMN invited_by_code_id TEXT;
UPDATE users SET is_paid_primordial = 1
  WHERE id IN (SELECT user_id FROM reservations WHERE status = 'claimed' AND user_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_primordial_n_unique ON users(primordial_n) WHERE primordial_n IS NOT NULL;
UPDATE counters SET value = MAX(value,
  COALESCE((SELECT MAX(primordial_n) FROM users), 0),
  COALESCE((SELECT MAX(primordial_n) FROM reservations), 0)) WHERE name = 'primordial';

CREATE TABLE IF NOT EXISTS invite_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  code_upper TEXT NOT NULL,
  kind TEXT NOT NULL,
  created_by_user_id TEXT,
  box_id TEXT,
  tier_id TEXT,
  duration_minutes INTEGER NOT NULL,
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  revoked_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_invite_codes_code_upper ON invite_codes(code_upper);
CREATE INDEX IF NOT EXISTS idx_invite_codes_creator ON invite_codes(created_by_user_id, kind, created_at);
CREATE INDEX IF NOT EXISTS idx_invite_codes_box ON invite_codes(box_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_expires ON invite_codes(expires_at);

CREATE TABLE IF NOT EXISTS invite_redemptions (
  id TEXT PRIMARY KEY,
  code_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (code_id, ip_hash)
);
CREATE INDEX IF NOT EXISTS idx_invite_redemptions_ip ON invite_redemptions(ip_hash);
CREATE INDEX IF NOT EXISTS idx_invite_redemptions_code ON invite_redemptions(code_id);

CREATE TABLE IF NOT EXISTS collective_box_tiers (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  goal_cents INTEGER NOT NULL,
  code_duration_minutes INTEGER NOT NULL,
  cooldown_minutes INTEGER NOT NULL,
  min_contribution_cents INTEGER NOT NULL DEFAULT 100,
  enabled INTEGER NOT NULL DEFAULT 1,
  auto_reopen INTEGER NOT NULL DEFAULT 1,
  carryover_cents INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL
);
INSERT OR IGNORE INTO collective_box_tiers (id, label, goal_cents, code_duration_minutes, cooldown_minutes, min_contribution_cents, enabled, auto_reopen, carryover_cents, sort_order) VALUES
  ('20', 'R$ 20', 2000, 60, 180, 100, 1, 1, 0, 1),
  ('50', 'R$ 50', 5000, 300, 240, 100, 1, 1, 0, 2),
  ('75', 'R$ 75', 7500, 600, 300, 100, 1, 1, 0, 3),
  ('100', 'R$ 100', 10000, 1440, 600, 100, 1, 1, 0, 4);

CREATE TABLE IF NOT EXISTS collective_boxes (
  id TEXT PRIMARY KEY,
  tier_id TEXT NOT NULL,
  round_n INTEGER NOT NULL,
  goal_cents INTEGER NOT NULL,
  raised_cents INTEGER NOT NULL DEFAULT 0,
  code_duration_minutes INTEGER NOT NULL,
  cooldown_minutes INTEGER NOT NULL,
  status TEXT NOT NULL,
  opened_at TEXT NOT NULL,
  funded_at TEXT,
  code_id TEXT,
  first_pix_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_collective_boxes_tier_status ON collective_boxes(tier_id, status);
CREATE INDEX IF NOT EXISTS idx_collective_boxes_tier_opened ON collective_boxes(tier_id, opened_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_collective_boxes_one_open ON collective_boxes(tier_id) WHERE status = 'open';

CREATE TABLE IF NOT EXISTS collective_contributions (
  id TEXT PRIMARY KEY,
  box_id TEXT NOT NULL,
  tier_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  email TEXT,
  status TEXT NOT NULL,
  mp_payment_id TEXT,
  qr_code TEXT,
  qr_code_base64 TEXT,
  ip_hash TEXT,
  created_at TEXT NOT NULL,
  paid_at TEXT,
  expires_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_collective_contrib_box ON collective_contributions(box_id);
CREATE INDEX IF NOT EXISTS idx_collective_contrib_status ON collective_contributions(status);
CREATE INDEX IF NOT EXISTS idx_collective_contrib_payment ON collective_contributions(mp_payment_id);

-- Espera das caixas conta a partir do 1º Pix confirmado (aplicado uma vez, verificando PRAGMA table_info(collective_boxes) antes):
-- ALTER TABLE collective_boxes ADD COLUMN first_pix_at TEXT;
-- Backfill não destrutivo:
UPDATE collective_boxes SET first_pix_at = (
  SELECT MIN(COALESCE(c.paid_at, c.created_at)) FROM collective_contributions c
  WHERE c.box_id = collective_boxes.id AND c.status = 'paid')
WHERE first_pix_at IS NULL
  AND EXISTS (SELECT 1 FROM collective_contributions c WHERE c.box_id = collective_boxes.id AND c.status = 'paid');
UPDATE collective_boxes SET first_pix_at = COALESCE(funded_at, opened_at) WHERE first_pix_at IS NULL AND status = 'funded';

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

-- Arte ASCII no perfil (/@Nome). Uma arte por usuário, texto puro.
-- frame: 'simples' (moldura de caixa igual para todos) ou 'nenhuma'.
CREATE TABLE IF NOT EXISTS profile_ascii (
  user_id TEXT PRIMARY KEY,
  art TEXT NOT NULL,
  frame TEXT NOT NULL DEFAULT 'simples' CHECK (frame IN ('simples', 'nenhuma')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_profile_ascii_updated ON profile_ascii(updated_at);

-- Avatar ASCII (/@Nome e ao lado do nome em comentários/postagens). Texto puro, até 8 linhas × 16 colunas.
CREATE TABLE IF NOT EXISTS profile_avatar (
  user_id TEXT PRIMARY KEY,
  art TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Exclusão pelo autor (ver migrate-exclusao-autor.sql; ALTER já aplicado):
-- ALTER TABLE comments ADD COLUMN author_deleted_at TEXT;
-- ALTER TABLE posts ADD COLUMN author_deleted_at TEXT;

-- Fixar (ver migrate-fixar.sql; ALTERs já aplicados):
-- ALTER TABLE posts ADD COLUMN pinned_at TEXT;
-- ALTER TABLE posts ADD COLUMN pinned_by TEXT;
-- ALTER TABLE comments ADD COLUMN pinned_at TEXT;
-- ALTER TABLE comments ADD COLUMN pinned_by TEXT;
CREATE INDEX IF NOT EXISTS idx_posts_pinned ON posts(community, pinned_at);
CREATE INDEX IF NOT EXISTS idx_comments_pinned ON comments(page, pinned_at);

-- Enquete no post (modelo 1). Uma enquete por postagem; 2 a 6 opções; 1 voto por conta, sem troca.
CREATE TABLE IF NOT EXISTS polls (
  post_id TEXT PRIMARY KEY,
  closes_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS poll_options (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  label TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_poll_options_post ON poll_options(post_id, position);
CREATE TABLE IF NOT EXISTS poll_votes (
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  option_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option ON poll_votes(option_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user ON poll_votes(user_id);

-- Cores nas artes ASCII (ver migrate-ascii-cores.sql; ALTERs já aplicados):
-- ALTER TABLE profile_ascii ADD COLUMN colors TEXT;
-- ALTER TABLE profile_avatar ADD COLUMN colors TEXT;
