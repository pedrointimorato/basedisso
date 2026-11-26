-- Camadas nas artes ASCII (até 4). layers = JSON [{arte, cores, visivel}] de baixo para cima.
-- art/colors continuam sendo a composição (lida por todo o site). NULL = arte antiga, tratada como 1 camada.
ALTER TABLE profile_ascii ADD COLUMN layers TEXT;
ALTER TABLE profile_avatar ADD COLUMN layers TEXT;
