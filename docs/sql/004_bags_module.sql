-- Enum: current status of a bag
DO $$
BEGIN
  CREATE TYPE bag_status AS ENUM (
    'disponivel',
    'em_uso',
    'em_transito',
    'danificada',
    'extraviada',
    'baixada'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- Enum: action recorded in a movement
DO $$
BEGIN
  CREATE TYPE bag_acao AS ENUM (
    'cadastrada',
    'enviada',
    'recebida',
    'em_uso',
    'devolvida',
    'danificada',
    'extraviada',
    'higienizacao',
    'baixada'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- Locations: stores, distribution centers, sectors
CREATE TABLE IF NOT EXISTS locais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('loja', 'cd', 'farma', 'setor', 'outro')),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bags: main asset registry
CREATE TABLE IF NOT EXISTS bags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL DEFAULT 'sacola',
  status bag_status NOT NULL DEFAULT 'disponivel',
  local_atual_id UUID REFERENCES locais(id),
  setor_atual TEXT,
  data_cadastro TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_ultima_movimentacao TIMESTAMPTZ,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bags_codigo_idx ON bags (codigo);
CREATE INDEX IF NOT EXISTS bags_status_idx ON bags (status) WHERE ativo = TRUE;
CREATE INDEX IF NOT EXISTS bags_local_atual_idx ON bags (local_atual_id) WHERE ativo = TRUE;

-- Movement history
CREATE TABLE IF NOT EXISTS bag_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bag_id UUID NOT NULL REFERENCES bags(id) ON DELETE CASCADE,
  acao bag_acao NOT NULL,
  local_origem_id UUID REFERENCES locais(id),
  local_destino_id UUID REFERENCES locais(id),
  setor TEXT,
  usuario_nome TEXT NOT NULL,
  observacao TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bag_movimentacoes_bag_idx
  ON bag_movimentacoes (bag_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bag_movimentacoes_created_idx
  ON bag_movimentacoes (created_at DESC);
