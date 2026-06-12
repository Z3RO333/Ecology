# Central de Medições (Fornecedor) — Design Spec (MVP)

**Data:** 2026-06-11
**Autor:** Gustavo Andrade
**Status:** Aprovado para implementação
**Contexto:** Estende o EcoTracker (app de reciclagem) com uma central onde
fornecedores enviam suas Medições mensais (pacotes de faturas em PDF) e o sistema
extrai os dados com IA e consolida no dashboard.

---

## 1. Visão geral

A "Medição" é o fechamento mensal de um fornecedor de coleta de resíduos (ex.: SA
Entulho) com **uma fatura por loja/CD da Bemol**. Hoje isso chega por e-mail como um
ZIP de PDFs. A central substitui esse fluxo manual:

1. O fornecedor faz login num portal (`/fornecedor`) e envia os PDFs da Medição.
2. O sistema lê cada fatura (texto do PDF → ChatGPT; OCR como fallback) e **extrai os
   dados estruturados**.
3. O time interno acompanha os totais consolidados no **dashboard** existente.

Não há, no MVP, workflow de aprovação nem notificações — o objetivo é **receber +
extrair + consolidar**.

## 2. Stack e decisões

| Camada | Decisão (MVP) |
|---|---|
| Framework | Next.js 15 (App Router, TS) — mesmo app EcoTracker |
| Login interno | Microsoft Entra ID (já existente), papéis admin/manager/operational |
| Login fornecedor | E-mail + **senha** (NextAuth Credentials, bcrypt). `app_users` ganha `password_hash`; `external_subject` passa a ser opcional para suppliers. Allowlist via `supplier_allowed_emails` |
| Banco transacional | **Azure Database for PostgreSQL** — schema `docs/sql/001_platform_core.sql` já versionado (`suppliers`, `app_users`, `document_submissions`, `submission_files`, `submission_events`, `audit_log`), aplicado por `scripts/migrate-platform.mjs` |
| Arquivos | Azure Blob Storage (container privado), download por rota autorizada |
| Dados extraídos | **Novas tabelas Postgres** (`invoice_extractions`, `invoice_line_items`) — ver §7 |
| Extração | Texto embutido do PDF → ChatGPT (structured outputs). OCR só de fallback para PDFs escaneados |
| Dashboard analítico | Recharts; agregados de reciclagem seguem no Databricks, consolidação das Medições lê do Postgres |

**Fundação escolhida:** a plataforma PostgreSQL **já scaffoldada** no repositório
(`pg`, SQL de migração, controle de acesso por papéis). Este MVP **constrói em cima
dela** a camada nova de extração com IA e a consolidação no dashboard. O Databricks
continua sendo o store analítico da reciclagem; a Medição é transacional → Postgres.

## 3. Áreas e papéis

Estende o controle de acesso já iniciado (`lib/access-control.ts`,
`lib/internal-roles.ts`):

- **`/fornecedor`** — papel `supplier`: cria Medição, faz upload, vê **somente as
  próprias** submissões e seus status.
- **`/dashboard`** — `admin`/`manager`: vê o consolidado das Medições e gerencia os
  e-mails de fornecedor autorizados (`admin`).

Regra de ouro: proteção de rota na UI **não basta**. Toda Server Action, Route
Handler, função de acesso a dados e download de arquivo revalida **autenticação +
papel + posse do recurso**.

## 4. Autenticação do fornecedor (e-mail + senha)

- O admin cadastra o fornecedor (`suppliers`) e seus e-mails autorizados
  (`supplier_allowed_emails`).
- **1º acesso**: e-mail está na allowlist **e** ainda não há `app_users` com senha →
  fornecedor define senha (com confirmação) → cria `app_users` (role `supplier`,
  `supplier_id` do e-mail, `password_hash` bcrypt).
- **Login**: e-mail + senha → verifica hash → sessão **cookie httpOnly escopada em
  `/fornecedor`** via NextAuth Credentials provider (separado do fluxo Entra interno).
- Senha **nunca** em texto puro; só hash (bcrypt, custo ≥ 12). Admin pode limpar a senha
  para forçar novo 1º acesso. Sem reset por e-mail no MVP.
- Migração `002` adiciona `password_hash TEXT` em `app_users` e torna `external_subject`
  anulável (suppliers por senha não têm subject externo).

## 5. Upload e armazenamento

- O fornecedor cria uma **Medição**: período (`MM/AAAA`), responsável (texto) e anexa
  1..N PDFs.
- **Validação** de cada arquivo:
  - Extensão `.pdf` + MIME `application/pdf` + assinatura `%PDF-` (magic bytes).
  - Limites: 15 MB por arquivo, até 20 arquivos, 100 MB por Medição.
  - SHA-256 calculado (rastreabilidade e detecção de duplicado).
- **Chave de armazenamento gerada no servidor** (UUID), nunca o nome original como
  caminho. Nome original guardado só como metadado de exibição (após remover caracteres
  de controle).
- PDF vai para **Azure Blob** (container privado `medicoes`). O banco guarda apenas a
  blob key + metadados.
- **Download** somente por Route Handler autorizado (`/api/fornecedor/file/[id]` e a
  versão interna no dashboard), que revalida posse/papel e faz stream do Blob. Sem URL
  pública permanente.

## 6. Pipeline de extração

Disparado no envio da Medição; processa cada fatura de forma assíncrona.

1. **Texto**: extrai o texto embutido do PDF (lib Node, ex. `unpdf`/`pdf-parse`).
2. **Fallback OCR**: se o texto vier vazio ou muito curto (PDF escaneado), envia as
   páginas para a **API de OCR** do usuário e usa o texto retornado.
3. **Estruturação (ChatGPT)**: envia o texto para a OpenAI com **structured outputs**
   (JSON Schema) e um prompt que descreve o layout da fatura. Extrai:
   - **Cabeçalho**: `numero`, `fornecedor_nome`, `fornecedor_cnpj`, `cliente_loja`,
     `cliente_cnpj`, `total`, `vencimento`, `situacao`, `forma_pagamento`.
   - **Itens[]**: `descricao`, `num_controle`, `volume_m3`, `num_cacamba`,
     `entregue_em`, `coletado_em`, `qtd`, `valor_unitario`, `valor_total`.
4. **Persistência**: grava o JSON bruto + achata nas tabelas `fatura` e `fatura_item`.
5. **Status por fatura**: `pendente → extraido → erro` (com mensagem de erro guardada).
   A Medição agrega: total extraído e contagem de faturas por status.

Modelo: `gpt-4o-mini` por padrão (custo baixo, suficiente para texto já limpo),
`gpt-4o` como opção para faturas difíceis. Temperatura 0.

## 7. Modelo de dados (PostgreSQL)

**Reusa o schema existente** (`docs/sql/001_platform_core.sql`):
- `suppliers`, `app_users`, `supplier_allowed_emails` — identidade e allowlist.
- `document_submissions` — uma submissão = uma **Medição** (`document_type='medicao'`,
  `competence_start/end` = período, `business_unit` = loja quando aplicável, `amount` =
  total). O `submission_status` cobre o workflow (no MVP usamos `submitted` →
  `approved`; transições completas ficam para a fase 2).
- `submission_files` — uma linha por PDF (blob_key, sha256, mime, size). Cada arquivo é
  uma **fatura**.
- `submission_events`, `audit_log` — trilha de auditoria.

**Tabelas novas** (migração `docs/sql/002_invoice_extraction.sql`), para a extração:

```sql
CREATE TABLE IF NOT EXISTS invoice_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL UNIQUE REFERENCES submission_files(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES document_submissions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',        -- pending | extracted | error
  error TEXT,
  source TEXT,                                    -- 'pdf-text' | 'ocr'
  numero TEXT, fornecedor_nome TEXT, fornecedor_cnpj VARCHAR(14),
  cliente_loja TEXT, cliente_cnpj VARCHAR(14),
  total NUMERIC(14,2), vencimento DATE, situacao TEXT, forma_pagamento TEXT,
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  extracted_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extraction_id UUID NOT NULL REFERENCES invoice_extractions(id) ON DELETE CASCADE,
  descricao TEXT, num_controle TEXT, volume_m3 NUMERIC(10,3), num_cacamba TEXT,
  entregue_em DATE, coletado_em DATE, qtd NUMERIC(12,3),
  valor_unitario NUMERIC(14,2), valor_total NUMERIC(14,2)
);
CREATE INDEX IF NOT EXISTS invoice_line_items_extraction_idx
  ON invoice_line_items (extraction_id);
```

Acesso a dados num módulo `lib/db.ts` (pool `pg`) com funções tipadas; toda query de
fornecedor inclui o `supplier_id` da sessão.

## 8. Dashboard — consolidação

Nova seção **"Medições"** no `/dashboard` (somente admin/manager):

- **KPIs do período**: total R$, nº de faturas, m³ coletado, peso coletado (kg), nº de
  lojas.
- **Gráficos**: valor por loja (barra), valor por período/mês (barra/linha).
- **Tabela de Medições**: fornecedor, período, responsável, total, status; *drill-down*
  para as faturas e, dentro da fatura, a lista de itens. Botão para baixar o PDF original
  (rota autorizada).

## 9. Segurança

- Auth + papel + posse revalidados em **todas** as Server Actions e Route Handlers.
- Fornecedor só acessa registros do próprio `fornecedor_id`; um ID vindo do cliente
  nunca é suficiente como autorização.
- Upload: valida assinatura/MIME/tamanho/quantidade; key gerada no servidor; Blob
  privado; download por rota autorizada com stream.
- Senha com bcrypt; segredos (OpenAI, OCR, Blob, Databricks) só em env/App Settings.
- `serverActions.allowedOrigins` inclui o domínio de produção (CSRF).
- Entrada da IA tratada como não-confiável: validação do JSON contra o schema; valores
  numéricos normalizados; falha de extração não derruba a Medição (marca `erro`).

## 10. Pré-requisitos (fornecidos pelo usuário / provisionados)

- **Azure Database for PostgreSQL** já existe: `ecotracker-pg.postgres.database.azure.com`.
  Definir `DATABASE_URL` (.env + App Settings); rodar `scripts/migrate-platform.mjs`
  (001) e a nova migração `002_invoice_extraction.sql`.
- Login de fornecedor por **senha** (ver §4) — sem dependência de Entra External ID.
- `OPENAI_API_KEY` (usuário já tem) + modelo `gpt-4o-mini`.
- **Azure Document Intelligence** (OCR de fallback): `AZURE_DOCINTEL_ENDPOINT` +
  `AZURE_DOCINTEL_KEY`.
- Azure Storage Account + container privado `medicoes` no RG `RGDIROPERACIONAL`
  (`AZURE_STORAGE_CONNECTION_STRING` nas App Settings).

## 11. Fora do escopo (fase 2)

- Workflow de aprovação (`submitted → under_review → approved/rejected → archived`),
  eventos imutáveis de transição e protocolo `ECO-AAAAMMDD-XXXXXXXX`.
- Microsoft Entra External ID + OTP para fornecedores.
- Notificações por e-mail (Azure Communication Services).
- Antivírus / quarentena de upload.
- Exportação para ERP/financeiro.
- Múltiplos tipos de documento configuráveis.
- Workflow completo de transições de status (além de `submitted`/`approved`).

## 12. Critérios de aceite (MVP)

1. Admin cadastra o e-mail de um fornecedor; o fornecedor faz 1º acesso, define senha e
   loga.
2. O fornecedor cria uma Medição `05/2026` e sobe os 9 PDFs de exemplo; todos são
   aceitos e armazenados no Blob.
3. Em até alguns minutos, cada fatura aparece com status `extraido` e os campos de
   cabeçalho + itens preenchidos corretamente para o lote de exemplo.
4. No dashboard, a seção Medições mostra o total R$ do período, por loja, e permite
   abrir a fatura e baixar o PDF.
5. Um fornecedor não consegue ver Medição de outro (verificado por posse).
