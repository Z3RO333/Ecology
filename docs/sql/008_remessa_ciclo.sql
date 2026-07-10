-- Redesign: single shipment with round-trip cycle (ida + volta)
ALTER TABLE bag_remessas ADD COLUMN IF NOT EXISTS qty_volta_enviada INTEGER;
ALTER TABLE bag_remessas ADD COLUMN IF NOT EXISTS qty_volta_recebida INTEGER;
ALTER TABLE bag_remessas ADD COLUMN IF NOT EXISTS volta_enviado_por TEXT;
ALTER TABLE bag_remessas ADD COLUMN IF NOT EXISTS volta_recebido_por TEXT;
ALTER TABLE bag_remessas ADD COLUMN IF NOT EXISTS volta_enviado_em TIMESTAMPTZ;
ALTER TABLE bag_remessas ADD COLUMN IF NOT EXISTS volta_recebido_em TIMESTAMPTZ;
ALTER TABLE bag_remessas ADD COLUMN IF NOT EXISTS observacao_volta_envio TEXT;
ALTER TABLE bag_remessas ADD COLUMN IF NOT EXISTS observacao_volta_recebimento TEXT;

-- Expand status to support full cycle
ALTER TABLE bag_remessas DROP CONSTRAINT IF EXISTS bag_remessas_status_check;
ALTER TABLE bag_remessas ADD CONSTRAINT bag_remessas_status_check
  CHECK (status IN ('ida_em_transito', 'ida_recebida', 'ida_divergencia', 'volta_em_transito', 'volta_recebida', 'volta_divergencia', 'concluida', 'em_transito', 'recebida', 'divergencia'));

-- Migrate old statuses
UPDATE bag_remessas SET status = 'ida_em_transito' WHERE status = 'em_transito';
UPDATE bag_remessas SET status = 'ida_recebida' WHERE status = 'recebida';
UPDATE bag_remessas SET status = 'ida_divergencia' WHERE status = 'divergencia';
