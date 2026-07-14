-- Each operational store starts with its assigned bag load. Keeping the
-- allocation on the unit makes future per-store adjustments straightforward.
ALTER TABLE locais
  ADD COLUMN IF NOT EXISTS bags_alocadas INTEGER NOT NULL DEFAULT 20;

ALTER TABLE locais DROP CONSTRAINT IF EXISTS locais_bags_alocadas_check;
ALTER TABLE locais ADD CONSTRAINT locais_bags_alocadas_check
  CHECK (bags_alocadas >= 0);
