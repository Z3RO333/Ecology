-- Shipments: tracks bags sent between locations with quantity reconciliation
CREATE TABLE IF NOT EXISTS bag_remessas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origem_id UUID NOT NULL REFERENCES locais(id),
  destino_id UUID NOT NULL REFERENCES locais(id),
  quantidade_enviada INTEGER NOT NULL CHECK (quantidade_enviada > 0),
  quantidade_recebida INTEGER,
  enviado_por TEXT NOT NULL,
  recebido_por TEXT,
  enviado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  recebido_em TIMESTAMPTZ,
  observacao_envio TEXT,
  observacao_recebimento TEXT,
  status TEXT NOT NULL DEFAULT 'em_transito' CHECK (status IN ('em_transito', 'recebida', 'divergencia')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bag_remessas_status_idx ON bag_remessas (status, enviado_em DESC);
CREATE INDEX IF NOT EXISTS bag_remessas_origem_idx ON bag_remessas (origem_id, enviado_em DESC);
CREATE INDEX IF NOT EXISTS bag_remessas_destino_idx ON bag_remessas (destino_id, enviado_em DESC);
