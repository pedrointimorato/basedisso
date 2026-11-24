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
