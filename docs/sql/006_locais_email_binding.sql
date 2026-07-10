-- Add centro (store code) to locais
ALTER TABLE locais ADD COLUMN IF NOT EXISTS centro INTEGER UNIQUE;

-- Expand tipo constraint to include 'farma'
ALTER TABLE locais DROP CONSTRAINT IF EXISTS locais_tipo_check;
ALTER TABLE locais ADD CONSTRAINT locais_tipo_check
  CHECK (tipo IN ('loja', 'cd', 'farma', 'setor', 'outro'));

-- Email-to-location mapping
CREATE TABLE IF NOT EXISTS local_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id UUID NOT NULL REFERENCES locais(id) ON DELETE CASCADE,
  email CITEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS local_emails_email_idx ON local_emails (email);
CREATE INDEX IF NOT EXISTS local_emails_local_idx ON local_emails (local_id);

-- Clear old test/dummy locais (only those without FK references)
DELETE FROM locais WHERE centro IS NULL
  AND id NOT IN (SELECT DISTINCT origem_id FROM bag_remessas)
  AND id NOT IN (SELECT DISTINCT destino_id FROM bag_remessas)
  AND id NOT IN (SELECT DISTINCT local_atual_id FROM bags WHERE local_atual_id IS NOT NULL);

-- Seed real locations from CSV
INSERT INTO locais (centro, nome, tipo) VALUES
  (101, 'Loja Matriz', 'loja'),
  (103, 'Loja Avenida', 'loja'),
  (104, 'CD Manaus', 'cd'),
  (105, 'Loja Educandos', 'loja'),
  (106, 'Loja Amazonas Shopping', 'loja'),
  (109, 'Loja Grande Circular', 'loja'),
  (114, 'Loja Ponta Negra', 'loja'),
  (115, 'Loja Cidade Nova', 'loja'),
  (116, 'Loja Studio 5', 'loja'),
  (118, 'Loja Camapua', 'loja'),
  (119, 'Loja Manauara', 'loja'),
  (120, 'Loja Shopping Ponta Negra', 'loja'),
  (121, 'Loja Nova Cidade', 'loja'),
  (148, 'CD Taruma', 'cd'),
  (201, 'Loja Porto Velho Centro', 'loja'),
  (202, 'Loja Porto Velho Shopping', 'loja'),
  (203, 'CD Porto Velho', 'cd'),
  (204, 'Loja Jatuarana', 'loja'),
  (205, 'Loja Ji-Parana', 'loja'),
  (206, 'Loja Ariquemes', 'loja'),
  (401, 'Loja Rio Branco', 'loja'),
  (402, 'CD Rio Branco', 'cd'),
  (404, 'Loja Cruzeiro do Sul', 'loja'),
  (500, 'Loja Torquato', 'loja'),
  (510, 'Loja Itacoatiara', 'loja'),
  (520, 'Loja Manacapuru', 'loja'),
  (530, 'Loja Presidente Figueiredo', 'loja'),
  (531, 'Loja Autazes', 'loja'),
  (550, 'Loja Iranduba', 'loja'),
  (560, 'Loja Rio Preto da Eva', 'loja'),
  (561, 'Loja Codajas', 'loja'),
  (570, 'Loja Manaquiri', 'loja'),
  (580, 'Loja Careiro', 'loja'),
  (590, 'Loja Parintins', 'loja'),
  (591, 'Loja Coari', 'loja'),
  (592, 'Loja Maues', 'loja'),
  (601, 'Farma Torquato', 'farma'),
  (602, 'Farma Camapua', 'farma'),
  (603, 'Farma Amazonas Shopping', 'farma'),
  (604, 'Farma Grande Circular', 'farma'),
  (605, 'Farma Matriz', 'farma'),
  (606, 'Farma Shopping Ponta Negra', 'farma'),
  (607, 'Farma Nova Cidade', 'farma'),
  (612, 'Farma Manauara', 'farma'),
  (614, 'Farma Presidente Figueiredo', 'farma'),
  (615, 'Farma Djalma', 'farma'),
  (617, 'Farma Ponta Negra DB', 'farma'),
  (618, 'Farma Studio 5', 'farma'),
  (620, 'Farma Avenida', 'farma'),
  (621, 'Farma Cidade Nova', 'farma'),
  (622, 'Farma Autazes', 'farma'),
  (623, 'Farma Ataide Teive', 'farma'),
  (624, 'Farma Manacapuru', 'farma'),
  (629, 'Farma Rio Preto', 'farma'),
  (633, 'Farma Manaquiri', 'farma'),
  (636, 'Farma Dom Pedro', 'farma'),
  (637, 'Farma Boulevard', 'farma'),
  (639, 'Farma Parintins', 'farma'),
  (640, 'Farma Coari', 'farma'),
  (642, 'Farma Via Norte', 'farma'),
  (643, 'Farma Efigenio Salles', 'farma'),
  (644, 'Farma Franceses', 'farma'),
  (645, 'Farma Coroado', 'farma'),
  (647, 'Farma Av. das Torres', 'farma'),
  (648, 'Farma Noel Nutels', 'farma'),
  (649, 'Farma Flores', 'farma'),
  (699, 'Farma Torres Online', 'farma'),
  (701, 'Loja Boa Vista Shopping', 'loja'),
  (702, 'Loja Ataide Teive', 'loja'),
  (703, 'Loja Rorainopolis', 'loja'),
  (704, 'CD Boa Vista', 'cd'),
  (705, 'Loja Getulio Vargas', 'loja'),
  (706, 'Loja Major Williams', 'loja')
ON CONFLICT (centro) DO UPDATE SET nome = EXCLUDED.nome, tipo = EXCLUDED.tipo;

-- Seed email mappings
INSERT INTO local_emails (local_id, email)
SELECT l.id, v.e_val
FROM (VALUES
  (101, 'gerenciabemolmatriz@bemol.com.br'),
  (103, 'gerenciabemolavenida@bemol.com.br'),
  (105, 'gerenciabemoleducandos@bemol.com.br'),
  (106, 'gerenciabemolshopping@bemol.com.br'),
  (109, 'gerenciabemolgrandecircular@bemol.com.br'),
  (114, 'gerenciabemolpontanegra@bemol.com.br'),
  (115, 'gerenciabemolcidadenova@bemol.com.br'),
  (116, 'gerenciabemolstudio5@bemol.com.br'),
  (118, 'gerenciabemolcamapua@bemol.com.br'),
  (119, 'gerenciabemolmanauara@bemol.com.br'),
  (120, 'gerenciabemolpnshopping@bemol.com.br'),
  (121, 'gerenciabemolnovacidade@bemol.com.br'),
  (201, 'gerenciabemolpvhcentro@bemol.com.br'),
  (202, 'gerenciabemolportovelhoshp@bemol.com.br'),
  (203, 'gerenciabemolcdpvh@bemol.com.br'),
  (204, 'gerenciabemoljatuarana@bemol.com.br'),
  (205, 'gerenciabemoljiparana@bemol.com.br'),
  (206, 'gerenciabemolariquemes@bemol.com.br'),
  (401, 'gerenciabemolriobranco@bemol.com.br'),
  (404, 'gerenciabemolcruzeirodosul@bemol.com.br'),
  (500, 'gerenciabemoltorquato@bemol.com.br'),
  (510, 'gerenciabemolitacoatiara@bemol.com.br'),
  (520, 'gerenciamanacapuru@bemol.com.br'),
  (520, 'gerenciabemolmanacapuru@bemol.com.br'),
  (530, 'gerenciabemolpresidentefigueiredo@bemol.com.br'),
  (531, 'gerenciabemolautazes@bemol.com.br'),
  (550, 'gerenciabemoliranduba@bemol.com.br'),
  (560, 'gerenciabemolriopretodaeva@bemol.com.br'),
  (561, 'gerenciabemolcodajas@bemol.com.br'),
  (570, 'gerenciabemolmanaquiri@bemol.com.br'),
  (580, 'gerenciabemolcareirocastanho@bemol.com.br'),
  (590, 'gerenciabemolparintins@bemol.com.br'),
  (591, 'gerenciabemolcoari@bemol.com.br'),
  (592, 'gerenciabemolmaues@bemol.com.br'),
  (601, 'farmaceuticostorquato@bemol.com.br'),
  (602, 'farmaceuticoscamapua@bemol.com.br'),
  (603, 'farmaceuticosshopping@bemol.com.br'),
  (604, 'farmaceuticosgrandecircular@bemol.com.br'),
  (605, 'farmaceuticosmatriz@bemol.com.br'),
  (606, 'farmaceuticosshoppingspn@bemol.com.br'),
  (607, 'farmaceuticosnovacidade@bemol.com.br'),
  (612, 'farmaceuticosmanauara@bemol.com.br'),
  (614, 'farmaceuticospresidentefigueiredo@bemol.com.br'),
  (615, 'farmaceuticosdjalma@bemol.com.br'),
  (617, 'farmaceuticospontanegradb@bemol.com.br'),
  (618, 'farmaceuticosstudio5@bemol.com.br'),
  (620, 'farmaceuticosavenida@bemol.com.br'),
  (621, 'farmaceuticoscidadenova@bemol.com.br'),
  (622, 'farmaceuticosautazes@bemol.com.br'),
  (623, 'farmaceuticosataideteive@bemol.com.br'),
  (624, 'farmaceuticosmanacapuru@bemol.com.br'),
  (629, 'farmaceuticosriopreto@bemol.com.br'),
  (633, 'farmaceuticosmanaquiri@bemol.com.br'),
  (636, 'farmaceuticosdompedro@bemol.com.br'),
  (637, 'farmaceuticosboulevard@bemol.com.br'),
  (639, 'farmaceuticosparintins@bemol.com.br'),
  (640, 'farmaceuticoscoari@bemol.com.br'),
  (642, 'farmaceuticosvianorte@bemol.com.br'),
  (643, 'farmaceuticosefigeniosalles@bemol.com.br'),
  (644, 'farmaceuticosfranceses@bemol.com.br'),
  (645, 'farmaceuticoscoroado@bemol.com.br'),
  (647, 'farmaceuticostorres@bemol.com.br'),
  (648, 'farmaceuticosnoelnutels@bemol.com.br'),
  (649, 'farmaceuticosflores@bemol.com.br'),
  (701, 'gerenciabemolboavista@bemol.com.br'),
  (702, 'gerenciabemolataide@bemol.com.br'),
  (703, 'gerenciabemolrorainopolis@bemol.com.br'),
  (705, 'gerenciabemolgetuliovargas@bemol.com.br'),
  (706, 'gerenciamajorwilliams@bemol.com.br')
) AS v(centro_val, e_val)
JOIN locais l ON l.centro = v.centro_val
ON CONFLICT (email) DO NOTHING;
