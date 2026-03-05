# PRD — Sistema Imobiliário (ia-imob)

## Visão Geral do Produto

Sistema de gestão imobiliária completo, composto por um painel administrativo (Next.js) e API backend (Laravel), voltado para imobiliárias do mercado brasileiro. A plataforma centraliza operações de cadastro de imóveis, gestão de leads (CRM), controle de usuários e permissões, e futuramente integrações com portais externos.

**Stack Tecnológica:**
- **Backend:** Laravel 11+, PHP 8.2+, PostgreSQL, Laravel Sanctum
- **Frontend:** Next.js 15+ (App Router), React 19, TypeScript, Tailwind CSS, Shadcn/UI

---

## Módulos do Sistema

### 1. Login e Autenticação

**Status:** ✅ Concluído

**Descrição:** Módulo de autenticação SPA via Laravel Sanctum (cookies HTTP-only + CSRF). Permite login por e-mail ou username, logout, verificação de sessão ativa e rastreamento de "último acesso" (`last_seen_at`).

**Funcionalidades:**
- Login com credencial flexível (e-mail ou username)
- Verificação de conta ativa (`is_active`)
- Rate limiting contra brute-force
- Endpoint `/api/user` para verificação de sessão
- Atualização automática de `last_seen_at` (status online)
- Proteção de rotas no frontend via middleware Next.js
- Estado global do usuário autenticado (Zustand/Context)

**Especificação técnica:** [technical-implementations/login/](file:///home/vinicius/apps/ia-imob/docs/technical-implementations/login/)

---

### 2. Gestão de Usuários

**Status:** ✅ Concluído

**Descrição:** CRUD completo de usuários do sistema (corretores, administradores), incluindo dados pessoais, profissionais, credenciais, horários de expediente e configurações de exibição no site público.

**Funcionalidades:**
- Listagem paginada com filtros avançados (código, nome, username, equipe, status, site, online)
- Criação e edição via modal (Dialog/Sheet)
- Upload de avatar
- Gestão de horários de expediente (2 períodos)
- Configurações de visibilidade no site (nome, redes sociais, descrição)
- Vínculo com grupo de permissões (Role)
- Indicador de status online baseado em `last_seen_at`

**Especificação técnica:** [technical-implementations/gestao-usuarios/](file:///home/vinicius/apps/ia-imob/docs/technical-implementations/gestao-usuarios/)

---

### 3. Grupos de Usuários (Roles & Permissions)

**Status:** ✅ Concluído

**Descrição:** Gerenciamento de perfis de acesso (RBAC) utilizando `spatie/laravel-permission`. Permite criar grupos com permissões granulares e atribuí-los a usuários.

**Funcionalidades:**
- Listagem de grupos com permissões associadas
- Criação/edição de grupos com seleção múltipla de permissões (checkboxes por categoria)
- Deleção de grupos (com proteção do grupo Administrador)
- Atribuição de grupo ao criar/editar usuário
- Permissões granulares: `recurso.view`, `recurso.create`, `recurso.edit.self`, `recurso.edit.all`, `recurso.delete`, `recurso.manage`
- Seeders de permissões e roles padrão
- Autorização via Form Requests (`authorize()`) e Policies

**Especificação técnica:** [technical-implementations/user-groups/](file:///home/vinicius/apps/ia-imob/docs/technical-implementations/user-groups/)

---

### 4. Cadastro de Imóveis

**Status:** 🔧 Em Desenvolvimento

**Descrição:** Módulo central para o portfólio imobiliário. Permite o cadastro completo de imóveis com dados detalhados exigidos pelo mercado brasileiro, incluindo fotos, vídeos, tour virtual, características (comodidades) e gestão interna (exclusividade, corretor captador, proprietário).

**Funcionalidades:**
- Formulário multi-step (Dados Básicos, Características, Valores, Localização, Mídias, Gestão Interna)
- Domínios dinâmicos via `system_enums` (tipo, finalidade, status)
- Busca de CEP integrada (ViaCEP/BrasilAPI) com captura de coordenadas
- Upload drag-and-drop de fotos com reordenação e definição de capa
- Relacionamento N:N com comodidades (features)
- Motor de filtros avançados (tipo, finalidade, valor, quartos, bairro, busca textual)
- Controle de publicação e destaque no site
- Controle de exclusividade com data de vencimento
- SoftDeletes

**Especificação técnica:** [technical-implementations/cadastro-imoveis/](file:///home/vinicius/apps/ia-imob/docs/technical-implementations/cadastro-imoveis/)

---

### 5. Gestão de Leads (CRM)

**Status:** 📋 Planejado

**Descrição:** CRM imobiliário com visualização Kanban para captura, qualificação e conversão de leads. Inclui distribuição automática de leads entre corretores, timeline de interações e indicadores de inatividade.

**Funcionalidades:**
- Board Kanban com drag-and-drop (etapas do funil de vendas)
- Distribuição automática de leads (Round Robin / Score por especialidade)
- Timeline de interações (ligações, anotações, transições de status)
- Indicador "Inativo há X dias" calculado no servidor (`days_inactive`)
- VGV (Valor Geral de Vendas) por coluna do Kanban (`expected_value`)
- Optimistic Updates na movimentação de cards
- Drawer de detalhes do lead com quick actions (WhatsApp, e-mail)
- Notificações em tempo real via WebSocket/Reverb

**Especificação técnica:** [technical-implementations/gestao-leads/](file:///home/vinicius/apps/ia-imob/docs/technical-implementations/gestao-leads/)

---

### 6. Gerador de Sites Corporativos (B2B SaaS)

**Status:** 📋 Planejado

**Descrição:** Plataforma White-Label (Multi-Tenant) que permite às imobiliárias gerarem e customizarem seus próprios sites públicos otimizados para SEO. Os imóveis cadastrados fluirão automaticamente para o site da respectiva imobiliária.

**Funcionalidades:**
- Isolamento de dados multi-tenant (banco, mídias e painel)
- Domínios customizados com roteamento via middleware
- Gestor de temas com configuração de cores, logo e links sociais
- Templates de design modernos focados em real estate
- Busca otimizada de imóveis (por bairro, tipo e valor) no site gerado
- Componentização nativa otimizada para Core Web Vitals (Imagens WEBP)
- SEO Dinâmico: Server-Side Rendering das listagens
- Schema.org Injetado e Sitemaps.xml on-the-fly para o Google

**Especificação técnica (Arquitetura):** [complex-plans/b2b-multi-tenant-website-builder.md](file:///home/vinicius/apps/ia-imob/docs/complex-plans/b2b-multi-tenant-website-builder.md)

---

## Convenções de Documentação

> [!IMPORTANT]
> **Regra obrigatória:** Toda nova feature ou módulo adicionado ao sistema deve ser incluído neste PRD **antes** de iniciar a implementação. A entrada no PRD deve conter: descrição, funcionalidades, status e link para a especificação técnica.

### Estrutura de Pastas

```
docs/
├─ roadmaps/
│  └─ PRD.md                               ← Este documento
└─ technical-implementations/
   └─ {nome-feature}/
      ├─ laravel/                           ← Especificação técnica do backend
      │  └─ especificacao.md (ou 01-backend.md)
      ├─ next/                              ← Especificação técnica do frontend
      │  └─ especificacao.md (ou 01-frontend.md)
      └─ SYNC_REPORT.md                    ← Relatório de sincronização de contrato
```

### Status de Módulo

| Ícone | Significado |
|-------|-------------|
| 📋 | Planejado — PRD escrito, especificação técnica criada |
| 🔧 | Em Desenvolvimento — implementação em andamento |
| ✅ | Concluído — implementado e funcional |
