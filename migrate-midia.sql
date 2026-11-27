-- MOR-38: upload de imagens e vídeos (arquivos no R2 "basedisso-media", binding MEDIA).
-- 1 arquivo por postagem/comentário. Enquanto não publicado: item_type/item_id NULL (pendente).
-- Quem enviou (uploader_id) nunca sai em API pública.
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  item_type TEXT CHECK (item_type IS NULL OR item_type IN ('post', 'comment')),
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
CREATE INDEX IF NOT EXISTS idx_media_uploader ON media (uploader_id, created_at);
CREATE INDEX IF NOT EXISTS idx_media_item ON media (item_type, item_id);
-- Aplicado uma vez (verificando PRAGMA table_info(communities) antes):
-- ALTER TABLE communities ADD COLUMN media_enabled INTEGER NOT NULL DEFAULT 0;
