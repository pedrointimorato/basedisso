-- Additive migration for primordial reservations (existing D1).
ALTER TABLE users ADD COLUMN is_primordial INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN primordial_n INTEGER;
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
