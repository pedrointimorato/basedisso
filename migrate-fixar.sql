-- Fixar postagens e comentários (ADMs). pinned_at NOT NULL = fixado. Aplicado uma vez (PRAGMA antes).
ALTER TABLE posts ADD COLUMN pinned_at TEXT;
ALTER TABLE posts ADD COLUMN pinned_by TEXT;
ALTER TABLE comments ADD COLUMN pinned_at TEXT;
ALTER TABLE comments ADD COLUMN pinned_by TEXT;
CREATE INDEX IF NOT EXISTS idx_posts_pinned ON posts(community, pinned_at);
CREATE INDEX IF NOT EXISTS idx_comments_pinned ON comments(page, pinned_at);
