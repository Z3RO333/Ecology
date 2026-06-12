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
| Login fornecedor | Allowlist de e-mails + **senha no 1º acesso** (NextAuth Credentials, hash bcrypt). Sem envio de e-mail. |
| Login interno | Microsoft Entra ID (já existente), papéis admin/manager |
| Arquivos | Azure Blob Storage (container privado), download por rota autorizada |
| Dados extraídos | Tabelas no Databricks (reusa a conexão REST existente) |
| Extração | Texto embutido do PDF → ChatGPT (structured outputs). OCR só de fallback para PDFs escaneados |
| Dashboard | Nova seção "Medições" no painel atual (Recharts) |

**Abordagem escolhida:** enxuta (reaproveita Databricks + dashboard; mínimo de
serviços novos — só o Blob). Migração para Postgres/Entra External ID fica para a fase 2.

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

## 4. Autenticação do fornecedor

- **Allowlist** `supplier_allowed_emails` (e-mails autorizados), gerenciada pelo admin.
  Bootstrap por env (`APP_SUPPLIER_EMAILS`) até a tabela existir; depois via tabela.
- **1º acesso**: e-mail está na allowlist **e** ainda não tem conta → fornecedor define
  senha (com confirmação) → cria registro `fornecedor` com `password_hash` (bcrypt).
- **Login**: e-mail + senha → verifica hash → sessão **cookie httpOnly escopada em
  `/fornecedor`** via NextAuth Credentials provider (separado do fluxo Entra interno).
- Senha **nunca** em texto puro; só hash (bcrypt, custo ≥ 12). Sem reset por e-mail no
  MVP (admin pode limpar a senha para forçar novo 1º acesso).

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

## 7. Modelo de dados (Databricks, schema `ecologyc`)

- **`fornecedor`**: `id`, `email` (único), `nome`, `password_hash`, `status`
  (`ativo`/`bloqueado`), `created_at`.
- **`supplier_allowed_emails`**: `email` (único), `added_by`, `added_at` (ou derivada de
  env no bootstrap).
- **`medicao`**: `id`, `fornecedor_id`, `periodo` (`MM/AAAA`), `responsavel`, `status`
  (`processando`/`concluida`/`erro_parcial`), `total_extraido`, `created_at`.
- **`fatura`**: `id`, `medicao_id`, `blob_key`, `filename`, `sha256`, `numero`,
  `fornecedor_cnpj`, `cliente_loja`, `total`, `vencimento`, `situacao`,
  `forma_pagamento`, `extract_status`, `extract_error`, `extracted_at`, `raw_json`.
- **`fatura_item`**: `id`, `fatura_id`, `descricao`, `num_controle`, `volume_m3`,
  `num_cacamba`, `entregue_em`, `coletado_em`, `qtd`, `valor_unitario`, `valor_total`.

Observação: Databricks é analítico (sem constraints transacionais). Para o volume do
MVP (poucos fornecedores, dezenas de faturas/mês) é aceitável. Unicidade de e-mail e
posse são garantidas em código. Migração para Postgres prevista na fase 2.

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

- `OPENAI_API_KEY` + modelo (`gpt-4o-mini` padrão).
- API de OCR (provider + credenciais) — usada só como fallback. **A definir.**
- Azure Storage Account + container privado `medicoes` no RG `RGDIROPERACIONAL`
  (`AZURE_STORAGE_CONNECTION_STRING` nas App Settings).
- Tabelas criadas no Databricks (`manutencao.ecologyc.*`).

## 11. Fora do escopo (fase 2)

- Workflow de aprovação (`submitted → under_review → approved/rejected → archived`),
  eventos imutáveis de transição e protocolo `ECO-AAAAMMDD-XXXXXXXX`.
- Microsoft Entra External ID + OTP para fornecedores.
- Notificações por e-mail (Azure Communication Services).
- Antivírus / quarentena de upload.
- Exportação para ERP/financeiro.
- Múltiplos tipos de documento configuráveis.
- Migração dos dados transacionais para Azure PostgreSQL.

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
