-- MOR-35: votos (+1/-1) e notas de relevância e coerência (1 a 5) em postagens e comentários.
-- Só contas votam (user_id obrigatório); um voto e uma nota por conta por item. Sem IP.
CREATE TABLE IF NOT EXISTS votes (
  item_type TEXT NOT NULL CHECK (item_type IN ('post', 'comment')),
  item_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  value INTEGER NOT NULL CHECK (value IN (-1, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (item_type, item_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_votes_updated ON votes(updated_at);
CREATE TABLE IF NOT EXISTS ratings (
  item_type TEXT NOT NULL CHECK (item_type IN ('post', 'comment')),
  item_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (item_type, item_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_ratings_user ON ratings(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_ratings_updated ON ratings(updated_at);
