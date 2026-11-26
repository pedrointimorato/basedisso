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
