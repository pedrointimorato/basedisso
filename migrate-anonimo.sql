-- >>anônimo: usuários logados podem publicar como >>anônimo.
-- O item é gravado com user_id NULL e name 'anônimo' (todas as junções públicas continuam sem autor);
-- o autor real fica só no servidor (anon_by) e anon_badge guarda o selo de ADM do momento ('site' ou NULL).
ALTER TABLE posts ADD COLUMN anon_by TEXT;
ALTER TABLE posts ADD COLUMN anon_badge TEXT;
ALTER TABLE comments ADD COLUMN anon_by TEXT;
ALTER TABLE comments ADD COLUMN anon_badge TEXT;
CREATE INDEX IF NOT EXISTS idx_posts_anon ON posts (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_anon ON comments (user_id, created_at);
