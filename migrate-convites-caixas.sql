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
  code_id TEXT
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
