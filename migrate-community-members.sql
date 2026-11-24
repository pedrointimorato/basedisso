-- Membros por comunidade /b/<slug> (idempotente)
CREATE TABLE IF NOT EXISTS community_members (
  community_slug TEXT NOT NULL,
  user_id TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  PRIMARY KEY (community_slug, user_id)
);
CREATE INDEX IF NOT EXISTS idx_community_members_user ON community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_members_joined ON community_members(community_slug, joined_at);
