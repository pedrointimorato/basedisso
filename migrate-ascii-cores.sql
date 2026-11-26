-- Cores por caractere nas artes ASCII (perfil e avatar).
-- Máscara com o mesmo formato da arte: uma linha por linha da arte, um código por caractere.
-- '.' = cor padrão do tema; '1'..'8' = vermelho, laranja, amarelo, verde, ciano, azul, roxo, cinza.
-- NULL = arte sem cor (comportamento antigo).
ALTER TABLE profile_ascii ADD COLUMN colors TEXT;
ALTER TABLE profile_avatar ADD COLUMN colors TEXT;
