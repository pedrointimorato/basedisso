-- MOR-36: etiquetas em postagens e comentários.
-- tags: definições (escopo 'site' ou o slug de uma b/). color: '0' = padrão, '1'..'8' = paleta do site (--ac-N).
-- item_tags: etiqueta aplicada a um item. added_by: 'autor' quando o autor escolheu (nunca o id: protege o anônimo) ou o id do ADM.
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '0' CHECK (color IN ('0', '1', '2', '3', '4', '5', '6', '7', '8')),
  description TEXT,
  created_by TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (scope, slug)
);
CREATE INDEX IF NOT EXISTS idx_tags_scope ON tags(scope, active, position);
CREATE TABLE IF NOT EXISTS item_tags (
  item_type TEXT NOT NULL CHECK (item_type IN ('post', 'comment')),
  item_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  added_by TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (item_type, item_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_item_tags_tag ON item_tags(tag_id, item_type);
INSERT OR IGNORE INTO tags (id, scope, name, slug, color, description, created_by, active, position, created_at, updated_at) VALUES
  ('tag-site-piada', 'site', 'piada', 'piada', '3', 'Humor, zoeira, não leve a sério.', NULL, 1, 10, '2026-11-27T03:00:00.000Z', '2026-11-27T03:00:00.000Z'),
  ('tag-site-serio', 'site', 'sério', 'serio', '1', 'Assunto sério, sem zoeira.', NULL, 1, 20, '2026-11-27T03:00:00.000Z', '2026-11-27T03:00:00.000Z'),
  ('tag-site-profissional', 'site', 'profissional', 'profissional', '6', 'Trabalho, carreira, assunto técnico.', NULL, 1, 30, '2026-11-27T03:00:00.000Z', '2026-11-27T03:00:00.000Z'),
  ('tag-site-opiniao', 'site', 'opinião', 'opiniao', '7', 'Ponto de vista pessoal.', NULL, 1, 40, '2026-11-27T03:00:00.000Z', '2026-11-27T03:00:00.000Z'),
  ('tag-site-pergunta', 'site', 'pergunta', 'pergunta', '2', 'Pedido de ajuda ou dúvida.', NULL, 1, 50, '2026-11-27T03:00:00.000Z', '2026-11-27T03:00:00.000Z'),
  ('tag-site-informativo', 'site', 'informativo', 'informativo', '4', 'Notícia, dado ou referência.', NULL, 1, 60, '2026-11-27T03:00:00.000Z', '2026-11-27T03:00:00.000Z');
