# GEMINI.md - Contexto do Projeto ia-imob

Este arquivo serve como guia mestre para o agente Gemini no projeto **ia-imob**, um sistema de gestão imobiliária B2B SaaS.

## 🚀 Visão Geral do Projeto

O **ia-imob** é uma plataforma completa para imobiliárias brasileiras, centralizando cadastro de imóveis, CRM de leads, gestão de usuários e automação de sites.

- **Backend:** Laravel 12 (PHP 8.2+), PostgreSQL/PostGIS, Sanctum.
- **Frontend:** Next.js 16+ (App Router), React 19, TypeScript, Tailwind CSS, Shadcn/UI.
- **Documentação:** O PRD oficial reside em `docs/roadmaps/PRD.md`.

---

## 🏗️ Arquitetura e Padrões

### Backend (Laravel)
- **Pattern:** Action / Service / Repository.
  - **Controllers:** Magros, apenas roteamento e resposta via **API Resources**.
  - **Actions/Services:** 100% da lógica de negócio.
  - **Repositories:** Apenas para consultas complexas (ex: PostGIS).
- **Segurança:** RBAC via `spatie/laravel-permission`. Autorização via **Policies** invocadas em **Form Requests**.
- **Dados:**
  - Migrations obrigatórias.
  - `system_enums` (tabela/seeder) como fonte única de verdade para domínios dinâmicos.
  - SoftDeletes em modelos de negócio.

### Frontend (Next.js)
- **Pattern:** Componentização baseada em Features (`src/components/features`).
- **Renderização:** RSC (React Server Components) por padrão. Client Components (`'use client'`) apenas para interatividade.
- **Estado:**
  - URL (Search Params) para filtros/paginação.
  - Zustand/Context para estado global leve.
  - TanStack Query para fetching/mutação no cliente.
- **Formulários:** React Hook Form + Zod (validação dupla: front e back).

---

## 🛠️ Comandos Principais

### Backend (`ai-backendd-imobiliaria`)
- **Setup:** `composer run setup` (instala, migra e gera chaves).
- **Desenvolvimento:** `composer run dev` (roda serve, queue, logs e vite simultaneamente).
- **Testes:** `composer run test` (roda Pest PHP).
- **Qualidade:** `./vendor/bin/pint` (estilo de código).

### Frontend (`ai-front-end-imobiliaria`)
- **Setup:** `npm install`
- **Desenvolvimento:** `npm run dev`
- **Build:** `npm run build`
- **Testes:** `npm run test` (Vitest + RTL).
- **Lint:** `npm run lint`

---

## 📜 Regras Invioláveis (Mandatos)

1.  **PRD Primeiro:** Nenhuma feature deve ser implementada sem antes estar documentada no `docs/roadmaps/PRD.md`.
2.  **Testes Obrigatórios:** Toda alteração ou nova funcionalidade **DEVE** ter testes automatizados (Pest no back, Vitest no front).
3.  **No-Code Zone em Docs:** O agente em modo arquitetural não deve gerar código de produção, apenas especificações técnicas em `docs/technical-implementations/`.
4.  **Tipagem Rigorosa:** PHP 8.2 (strict types) e TypeScript (sem `any`).
5.  **Clean Code:** Siga o SRP (Single Responsibility Principle) e evite Controllers ou Services inflados.

---

## 📂 Estrutura de Diretórios

- `.agents/rules/`: Regras detalhadas por tecnologia (Laravel/Nextjs).
- `ai-backendd-imobiliaria/`: Código fonte da API Laravel.
- `ai-front-end-imobiliaria/`: Código fonte do Dashboard Next.js.
- `docs/roadmaps/PRD.md`: Roadmap e visão geral de módulos.
- `docs/technical-implementations/`: Especificações técnicas detalhadas por feature.
