-- MOR-39: avatar ASCII das b/ (cabeçalho da b/, lista de comunidades, painel lateral).
-- Mesmo formato do avatar de perfil (profile_avatar): até 8 linhas × 16 colunas, cores por caractere e até 4 camadas.
-- art/colors = composição (lida pelo site); layers = JSON [{arte, cores, visivel}] para o editor. Sem linha = "b" laranja de sempre.
-- updated_by: conta de ADM que salvou por último (não sai em API pública).
CREATE TABLE IF NOT EXISTS community_avatar (
  slug TEXT PRIMARY KEY,
  art TEXT NOT NULL,
  colors TEXT,
  layers TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
