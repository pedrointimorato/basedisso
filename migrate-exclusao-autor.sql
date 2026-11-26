-- Exclusão pelo próprio autor (aplicado uma vez, verificando PRAGMA table_info antes).
-- Comentário com respostas / postagem com comentários: o conteúdo é apagado e a linha fica
-- marcada (author_deleted_at) para manter a thread. Sem respostas/comentários: DELETE.
ALTER TABLE comments ADD COLUMN author_deleted_at TEXT;
ALTER TABLE posts ADD COLUMN author_deleted_at TEXT;
