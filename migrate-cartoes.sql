-- Cartões editáveis: painel /b (site_cards) e cartão de cada /b/<slug> (communities.subtitle/sidebar_text)
CREATE TABLE IF NOT EXISTS site_cards (
  key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  body TEXT,
  updated_at TEXT,
  updated_by TEXT
);
INSERT OR IGNORE INTO site_cards (key, title, subtitle, body, updated_at, updated_by) VALUES
  ('b_panel', 'Comunidades', 'painel do basedisso', 'Um espaço para comunidades no estilo do fórum antigo. Entre em uma delas para ler e criar postagens.', '2026-11-24T00:00:00.000Z', 'seed');
-- Aplicado uma vez (verificando PRAGMA table_info(communities) antes):
-- ALTER TABLE communities ADD COLUMN subtitle TEXT;
-- ALTER TABLE communities ADD COLUMN sidebar_text TEXT;
UPDATE communities SET subtitle = 'solicitações · >>Intimorato',
  sidebar_text = 'Espaço para solicitações, queixas, elogios, sugestões ou ofertas. Qualquer pessoa pode criar uma postagem, anônima ou com nome.' || char(10) || char(10) || 'Deixe um comentário no aviso fixado ou me envie um e-mail: Intimorato@mail.ru'
  WHERE slug = 'adm' AND subtitle IS NULL AND sidebar_text IS NULL;
UPDATE communities SET subtitle = 'off topic · b/atoa',
  sidebar_text = 'Comunidade livre, sem assunto definido. Qualquer pessoa pode criar uma postagem, anônima ou com nome.'
  WHERE slug = 'atoa' AND subtitle IS NULL AND sidebar_text IS NULL;
