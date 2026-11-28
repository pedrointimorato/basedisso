-- MOR-43: postagens escritas no próprio perfil (aparecem no perfil e no feed da página inicial).
CREATE TABLE IF NOT EXISTS profile_posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0,
  author_deleted_at TEXT,
  ip_hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_profile_posts_user ON profile_posts (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_profile_posts_feed ON profile_posts (created_at);

-- Arquivos também podem ir numa postagem de perfil (só ADM do site, fora de b/).
-- D1/SQLite não altera CHECK; recria a tabela de mídia com o novo tipo.
CREATE TABLE media_mor43 (
  id TEXT PRIMARY KEY,
  item_type TEXT CHECK (item_type IS NULL OR item_type IN ('post', 'comment', 'perfil')),
  item_id TEXT,
  scope TEXT,
  r2_key TEXT NOT NULL UNIQUE,
  thumb_key TEXT NOT NULL UNIQUE,
  mime TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  thumb_bytes INTEGER NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  duration REAL,
  original_name TEXT NOT NULL,
  uploader_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  attached_at TEXT,
  UNIQUE (item_type, item_id)
);
INSERT INTO media_mor43 SELECT * FROM media;
DROP TABLE media;
ALTER TABLE media_mor43 RENAME TO media;
CREATE INDEX IF NOT EXISTS idx_media_uploader ON media (uploader_id, created_at);
CREATE INDEX IF NOT EXISTS idx_media_item ON media (item_type, item_id);
