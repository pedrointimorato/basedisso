CREATE TABLE IF NOT EXISTS communities (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  posting TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL
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
