-- Avatar ASCII (/@Nome e ao lado do nome em comentários/postagens). Texto puro, até 8 linhas × 16 colunas.
CREATE TABLE IF NOT EXISTS profile_avatar (
  user_id TEXT PRIMARY KEY,
  art TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
