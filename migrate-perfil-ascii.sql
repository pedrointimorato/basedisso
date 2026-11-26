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
