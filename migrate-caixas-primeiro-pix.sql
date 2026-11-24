-- Espera das caixas conta a partir do 1º Pix confirmado (aplicado uma vez, verificando PRAGMA table_info(collective_boxes) antes):
-- ALTER TABLE collective_boxes ADD COLUMN first_pix_at TEXT;
-- Backfill não destrutivo:
UPDATE collective_boxes SET first_pix_at = (
  SELECT MIN(COALESCE(c.paid_at, c.created_at)) FROM collective_contributions c
  WHERE c.box_id = collective_boxes.id AND c.status = 'paid')
WHERE first_pix_at IS NULL
  AND EXISTS (SELECT 1 FROM collective_contributions c WHERE c.box_id = collective_boxes.id AND c.status = 'paid');
UPDATE collective_boxes SET first_pix_at = COALESCE(funded_at, opened_at) WHERE first_pix_at IS NULL AND status = 'funded';
