-- Banir conexões (sem conta) pelo hash salgado do IP já gravado em posts/comments.ip_hash.
-- scope = 'site' (ADM do site) ou o slug da b/ (ADM da b/). expires_at NULL = permanente.
CREATE TABLE IF NOT EXISTS connection_bans (
  id TEXT PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  scope TEXT NOT NULL,
  reason TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_connection_bans_hash ON connection_bans(ip_hash, scope);
CREATE INDEX IF NOT EXISTS idx_connection_bans_scope ON connection_bans(scope, created_at);
-- Quem editou por último o perfil coletivo >>anônimo (arte / avatar).
CREATE TABLE IF NOT EXISTS profile_edit_log (
  target_id TEXT PRIMARY KEY,
  edited_by TEXT,
  edited_at TEXT NOT NULL,
  what TEXT
);
