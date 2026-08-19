# 🌱 EcoTracker

Plataforma Full-Stack para gestão ambiental, rastreabilidade operacional e acompanhamento de indicadores de sustentabilidade.

O projeto combina uma experiência web administrativa com uma interface dedicada para tablet/PWA, permitindo registrar operações em campo e consolidar os dados em dashboards e relatórios.

## ✨ Principais recursos

- Dashboard gerencial com indicadores e visualizações
- Interface dedicada para tablet em modo PWA
- Gestão de fornecedores e fluxos operacionais
- Autenticação e controle de acesso
- Processamento e armazenamento de documentos
- Integração com dados analíticos
- Relatórios e gráficos para acompanhamento da operação
- Arquitetura preparada para automações e integrações corporativas

## 🛠️ Stack

- **Next.js 16**
- **React 19**
- **TypeScript**
- **PostgreSQL**
- **Databricks SQL**
- **Azure Blob Storage**
- **NextAuth / Auth.js**
- **Tailwind CSS**
- **Recharts**
- **SendGrid**
- **Vitest**
- **PWA**

## 🏗️ Arquitetura

A aplicação é dividida em experiências específicas para cada tipo de uso:

- `/dashboard` — visão gerencial e indicadores
- `/tablet` — interface operacional instalada como PWA
- `/fornecedor` — fluxo dedicado a fornecedores
- `/api` — APIs e integrações server-side

A camada de dados utiliza PostgreSQL e integrações com Databricks, enquanto documentos e arquivos podem ser armazenados em Azure Blob Storage.

## 🎯 Objetivo

Digitalizar processos ambientais que normalmente dependem de controles manuais, oferecendo mais rastreabilidade, dados centralizados e indicadores para apoiar decisões operacionais e de sustentabilidade.

## 🔐 Segurança

Credenciais, tokens, dados reais, URLs privadas e informações específicas do ambiente de produção não fazem parte da documentação pública do projeto.

## 🚀 Desenvolvimento

```bash
npm install
npm run dev
```

Validação:

```bash
npm run lint
npm run test
npm run build
```
