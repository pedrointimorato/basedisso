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
  created_at TEXT NOT NULL
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
  created_by TEXT
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
