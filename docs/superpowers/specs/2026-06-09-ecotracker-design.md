# EcoTracker — Design Spec (MVP)

**Data:** 2026-06-09  
**Autor:** Gustavo Andrade  
**Status:** Aprovado para implementação

---

## 1. Visão Geral

Sistema de rastreamento de reciclagem composto por duas interfaces distintas:

- **Tablet operacional** — formulário em modo quiosque, sem autenticação, usado por colaboradores para registrar materiais reciclados.
- **Painel web administrativo** — dashboard protegido por login Microsoft SSO, usado por gestores para acompanhar indicadores e histórico.

Substitui o formulário atual (Google Forms / similar) por uma aplicação profissional com banco de dados estruturado e dashboards gerenciais.

---

## 2. Stack Técnico

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Hosting | Azure App Service (B1) |
| Banco de dados | Databricks SQL Warehouse (Delta tables) |
| Conector DB | `@databricks/sql` + Personal Access Token (PAT) |
| Autenticação | NextAuth.js com provider Microsoft Entra ID (SSO) |
| Gráficos | Recharts |
| Estilo | Tailwind CSS (tema verde sustentável) |
| Deploy | GitHub → Azure App Service (CI/CD) |

---

## 3. Arquitetura

```
Azure App Service
└── Next.js 15 App
    ├── /tablet              → Quiosque (sem auth)
    ├── /dashboard           → Painel gerencial (auth obrigatório)
    │   └── /records         → Histórico com filtros
    ├── /api/records         → POST (criar) · GET (listar)
    ├── /api/analytics       → GET (dados agregados)
    ├── /auth/[...nextauth]  → NextAuth callbacks
    └── middleware.ts        → Protege /dashboard, libera /tablet
```

### Fluxo do Tablet
1. Colaborador abre `/tablet` no browser (sem login)
2. Seleciona material, setor, digita peso e nome do responsável
3. Submete → Server Action → INSERT no Databricks
4. Tela mostra confirmação e reseta para novo registro

### Fluxo do Dashboard
1. Gestor acessa `/dashboard` → redirecionado para login Microsoft SSO
2. Após autenticação, carrega página com KPIs e gráficos
3. Dados buscados via Route Handlers → queries SQL no Databricks
4. Filtros atualizam queries dinamicamente (sem realtime)

---

## 4. Banco de Dados — Databricks

### Tabela: `recycling_records`

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | STRING | UUID gerado no servidor |
| `material_type` | STRING | Ver lista abaixo |
| `weight_kg` | DECIMAL(10,3) | Peso em quilogramas |
| `sector` | STRING | Ver lista abaixo |
| `responsible_name` | STRING | Nome do colaborador |
| `notes` | STRING | Nullable |
| `recorded_at` | TIMESTAMP | Data e hora do registro |
| `recorded_date` | DATE | Derivado de `recorded_at`, facilita filtros |

### Materiais aceitos (constantes no código)
`Papel` · `Plástico` · `Metal` · `Vidro` · `Orgânico` · `Eletrônico` · `Outro`

### Setores aceitos (constantes no código)
`Escritório 1` · `Copa` · `Escritório Anexo` · `Loja` · `Mercado` · `Farma` · `Outros`

---

## 5. Interface — Tablet (`/tablet`)

**Objetivo:** Entrada de dados rápida, botões grandes, mínima digitação.

**Campos:**
1. **Tipo de Material** — grid de botões, seleção única, toggle visual (verde = selecionado)
2. **Setor** — dropdown com a lista de setores
3. **Peso (kg)** — campo numérico com botões de incremento rápido (+0,1 / +0,5 / +1,0 / +5,0)
4. **Responsável** — campo de texto livre
5. **Observações** — campo de texto opcional (colapsado por padrão)

**UX:**
- Data e hora preenchidas automaticamente no momento do envio
- Após confirmação: toast de sucesso + reset do formulário em 2 segundos
- Visual: fundo branco/verde claro, botão principal verde `#16a34a`
- Sem navegação, sem header de autenticação

---

## 6. Interface — Dashboard (`/dashboard`)

### Página principal — KPIs e Gráficos

**KPIs (cards no topo):**
- Total reciclado no período (kg)
- Número de registros
- Setores ativos

**Gráficos:**
- Peso por período (BarChart — diário / semanal / mensal, toggle)
- Materiais mais reciclados (PieChart)
- Ranking de setores (BarChart horizontal)

**Filtros (header):**
- Período: seletor de data (padrão: mês atual)
- Setor: dropdown multi-select
- Material: dropdown multi-select

### Página `/dashboard/records`

- Tabela com todos os registros
- Colunas: Data/Hora · Material · Peso · Setor · Responsável · Observações
- Paginação (50 registros por página)
- Mesmos filtros da página principal
- Botão de exportar CSV

---

## 7. Autenticação

- NextAuth.js com provider `AzureAD` (Microsoft Entra ID)
- Variáveis de ambiente: `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID`
- Sessão via JWT cookie
- `middleware.ts` protege todas as rotas `/dashboard/*`
- Rota `/tablet` explicitamente excluída do middleware

---

## 8. Variáveis de Ambiente

```env
# Auth
NEXTAUTH_URL=https://<app>.azurewebsites.net
NEXTAUTH_SECRET=<gerado>
AZURE_AD_CLIENT_ID=<da API Microsoft>
AZURE_AD_CLIENT_SECRET=<da API Microsoft>
AZURE_AD_TENANT_ID=<do tenant Azure>

# Databricks
DATABRICKS_SERVER_HOSTNAME=<workspace>.azuredatabricks.net
DATABRICKS_HTTP_PATH=/sql/1.0/warehouses/<id>
DATABRICKS_TOKEN=<PAT>
DATABRICKS_CATALOG=<catalog>
DATABRICKS_SCHEMA=<schema>
```

---

## 9. Fora do Escopo (MVP)

- Cadastro de usuários (quem tem SSO da empresa já tem acesso ao dashboard)
- Multi-tenant / múltiplas empresas
- Notificações ou alertas automáticos
- Realtime / WebSockets
- Upload de fotos dos materiais
- Relatórios em PDF
- Gestão de setores/materiais via interface (lista gerenciada no código)

---

## 10. Fases de Desenvolvimento

### Fase 1 — Infraestrutura base
- Projeto Next.js com TypeScript e Tailwind
- Configuração Databricks (`@databricks/sql`, criação da tabela)
- NextAuth com Microsoft Entra ID
- Middleware de proteção de rotas
- Deploy inicial no Azure App Service

### Fase 2 — Tablet
- Página `/tablet` com formulário completo
- Server Action para gravar no Databricks
- Validação de campos
- Feedback visual de sucesso/erro

### Fase 3 — Dashboard
- Página `/dashboard` com KPIs e gráficos (Recharts)
- Route Handler `/api/analytics` com queries SQL agregadas
- Filtros por período, setor e material
- Toggle diário/semanal/mensal

### Fase 4 — Histórico e exportação
- Página `/dashboard/records` com tabela paginada
- Route Handler `/api/records` com filtros
- Exportação CSV
