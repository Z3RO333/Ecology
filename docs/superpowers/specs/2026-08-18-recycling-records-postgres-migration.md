# Migração de recycling_records: Databricks -> Postgres

## Motivação

O SQL Warehouse do Databricks (`Starter Endpoint`, serverless XSMALL) tem
`auto_stop_mins: 10` e o usuário não tem permissão `CAN_MANAGE` para
aumentar esse valor (só o criador do warehouse tem). Como o tablet grava
registros esporadicamente ao longo do dia, o warehouse frequentemente
"dorme" entre um registro e outro; o próximo insert dispara um
`auto_resume` cujo cold-start pode estourar o tempo de espera da API,
causando envios lentos ou que falham no tablet.

O app já tem um Postgres provisionado no mesmo grupo de recursos
(`ecotracker-pg`, Azure Database for PostgreSQL Flexible Server,
Burstable B1ms, `RGDIROPERACIONAL`), usado hoje só para `app_users`. Esse
tier não hiberna por inatividade — movendo `recycling_records` pra lá o
problema de cold-start deixa de existir.

Volume de dados na migração: 40 registros (14/08 a 18/08/2026),
confirmado via `SELECT COUNT(*)` no Databricks. Nenhum outro
consumidor usa essa tabela fora deste app.

## Escopo

- Nova tabela `recycling_records` no Postgres `ecotracker-pg`.
- `lib/databricks.ts` -> `lib/records.ts`, mesmas 6 funções exportadas
  com assinatura idêntica (`insertRecord`, `getRecords`, `getKPIs`,
  `getByPeriod`, `getByMaterial`, `getBySector`), implementadas sobre
  `lib/db.ts` (pool `pg` já usado por `app_users`) em vez da Statement
  Execution REST API do Databricks.
- Atualizar os 6 call sites que importam de `@/lib/databricks` para
  `@/lib/records`.
- Migrar os 40 registros existentes do Databricks pro Postgres.
- Fora de escopo: limpar `DATABRICKS_*` do App Service (deixa como
  está, sem uso). Apagar a tabela no Databricks só depois de o usuário
  confirmar que o Postgres está correto em produção.

## Schema

```sql
CREATE TABLE recycling_records (
  id TEXT PRIMARY KEY,
  material_type TEXT NOT NULL,
  weight_kg NUMERIC(10,3) NOT NULL,
  sector TEXT NOT NULL,
  responsible_name TEXT NOT NULL,
  notes TEXT,
  recorded_at TIMESTAMP NOT NULL,
  recorded_date DATE NOT NULL
);

CREATE INDEX idx_recycling_records_recorded_date ON recycling_records (recorded_date);
```

`id` continua sendo `randomUUID()` gerado em app (TEXT, não UUID nativo,
pra bater com o tipo já usado em `RecyclingRecord.id: string` e evitar
cast extra). `recorded_at`/`recorded_date` mantêm o mesmo formato de
wall-clock sem timezone que o código já grava hoje
(`formatDateInAppTimeZone`).

## Tradução das queries (Spark SQL -> Postgres)

- `:named` params -> `$1, $2, ...` posicionais (formato que `lib/db.ts`
  já usa em `internal-users.ts`).
- `WEEKOFYEAR(d)` (não usado mais, já tinha sido trocado por
  `DATE_TRUNC`) / `DATE_TRUNC('WEEK', d)` -> `DATE_TRUNC('week', d)`
  (Postgres trunca pra segunda-feira igual ao Spark).
- `DATE_FORMAT(d, 'dd/MM')` -> `TO_CHAR(d, 'DD/MM')`.
- `DATE_FORMAT(d, 'MM/yyyy')` -> `TO_CHAR(d, 'MM/YYYY')`.
- `DATE_ADD(d, 6)` -> `d + INTERVAL '6 days'`.
- `CAST(x AS DOUBLE)` -> `x::float8` (ou deixa `NUMERIC` mesmo, já que
  `pg` retorna `NUMERIC` como string; a camada de conversão
  `NUMERIC_TYPES` do módulo antigo é substituída por `Number(...)`
  explícito nos campos agregados).
- `buildInClause` (allowlist de sector/material, escapando aspas) segue
  igual — já é seguro pro Postgres também.

## Migração de dados

Script one-off (`scripts/migrate-recycling-records.ts` ou rodado
diretamente): lê os 40 registros do Databricks via a Statement
Execution API (reaproveitando a lógica de query já existente antes de
apagar o arquivo antigo), insere no Postgres, confere `COUNT(*)` e
`SUM(weight_kg)` batendo dos dois lados. Script é descartado depois de
confirmado (não fica no repo).

## Testes

- `npx tsc --noEmit` depois da troca dos imports.
- Rodar dashboard localmente contra o Postgres real e conferir KPIs,
  gráfico por período (diário/semanal/mensal), ranking por setor,
  export CSV e histórico de registros batendo com os números que
  hoje vêm do Databricks (antes de apagar a tabela lá).
- Testar um registro novo pelo tablet (`/tablet/escritorio` ou
  `/tablet/cd`) e confirmar que aparece no dashboard.

## Rollback

Enquanto a tabela do Databricks não for apagada, reverter é só voltar
o import pro `lib/databricks.ts` antigo (mantido no histórico do git)
e reverter os call sites.
