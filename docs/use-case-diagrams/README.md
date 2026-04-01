# Diagramas de Caso de Uso — ia-imob

> Documentação UML de Casos de Uso para todos os módulos do sistema, derivada do [PRD](file:///home/vinicius/apps/ia-imob/docs/roadmaps/PRD.md), das especificações técnicas e dos requisitos funcionais do PAC.

> [!NOTE]
> Mermaid não possui suporte nativo a diagramas de caso de uso UML. Os diagramas abaixo utilizam `flowchart LR` com convenção visual: **atores à esquerda** (`🧑 Actor`), **casos de uso como nós arredondados no centro**, e relações `include`/`extend` diferenciadas por tracejado.

---

## Sumário

1. [Login e Autenticação](#1-login-e-autenticação)
2. [Gestão de Usuários](#2-gestão-de-usuários)
3. [Grupos de Usuários — RBAC](#3-grupos-de-usuários--rbac)
4. [Cadastro de Imóveis](#4-cadastro-de-imóveis)
5. [Gestão de Leads — CRM](#5-gestão-de-leads--crm)
6. [Gerador de Sites White-Label — B2B SaaS](#6-gerador-de-sites-white-label--b2b-saas)
7. [Pagamento Recorrente — Asaas](#7-pagamento-recorrente--asaas)
8. [AI Searcher — Base Consolidada de Jaraguá](#8-ai-searcher--base-consolidada-de-jaraguá)
9. [Ecossistema de Integração](#9-ecossistema-de-integração)

---

## Atores do Sistema

| Ator | Descrição |
|------|-----------|
| **Corretor** | Usuário operacional do sistema. Gerencia imóveis, atende leads, usa o painel CRM |
| **Administrador** | Superusuário com permissões totais. Gerencia usuários, grupos, configurações do sistema |
| **Gerente de Imobiliária** | Dono/gestor da imobiliária (tenant). Configura site, planos, integrações |
| **Visitante** | Usuário anônimo que acessa o site público da imobiliária |
| **Sistema (Scheduler)** | Processos automatizados (Jobs, Cron, Webhooks) |
| **Portal Externo** | Plataformas externas (ZAP, VivaReal, OLX, Asaas) |

---

## 1. Login e Autenticação

**Status:** ✅ Implementado

```mermaid
flowchart LR
    Actor["🧑 Corretor / Admin"]

    UC1(["Fazer Login\n(e-mail ou username)"])
    UC2(["Fazer Logout"])
    UC3(["Verificar Sessão Ativa"])
    UC4(["Atualizar Status Online\n(ping)"])

    INC1(["«include»\nValidar Credenciais"])
    INC2(["«include»\nVerificar Conta Ativa"])
    INC3(["«include»\nRate Limiting"])
    INC4(["«include»\nRegerar Sessão CSRF"])

    Actor --> UC1
    Actor --> UC2
    Actor --> UC3
    Actor --> UC4

    UC1 -.-> INC1
    UC1 -.-> INC2
    UC1 -.-> INC3
    UC1 -.-> INC4
    UC4 -.-> |"atualiza last_seen_at"| INC2
```

### Descrição dos Casos de Uso

| ID | Caso de Uso | Ator | Descrição |
|----|-------------|------|-----------|
| UC1.1 | Fazer Login | Corretor/Admin | Autentica via e-mail ou username + senha. Regenera sessão e token CSRF |
| UC1.2 | Fazer Logout | Corretor/Admin | Invalida sessão e regenera CSRF token |
| UC1.3 | Verificar Sessão | Corretor/Admin | Endpoint `/api/user` retorna usuário autenticado ou 401 |
| UC1.4 | Atualizar Status Online | Corretor/Admin | Endpoint `/api/ping` atualiza `last_seen_at` periodicamente |

---

## 2. Gestão de Usuários

**Status:** ✅ Implementado

```mermaid
flowchart LR
    Admin["🧑 Administrador"]

    UC1(["Listar Usuários\n(paginado + filtros)"])
    UC2(["Visualizar Usuário"])
    UC3(["Criar Usuário"])
    UC4(["Editar Usuário"])
    UC5(["Excluir Usuário\n(soft delete)"])
    UC6(["Upload de Avatar"])
    UC7(["Atribuir Grupo\nde Permissão"])

    INC1(["«include»\nValidar Dados"])
    EXT1(["«extend»\nFiltrar por Status Online"])
    EXT2(["«extend»\nFiltrar por Equipe"])

    Admin --> UC1
    Admin --> UC2
    Admin --> UC3
    Admin --> UC4
    Admin --> UC5

    UC3 -.-> UC6
    UC4 -.-> UC6
    UC3 -.-> UC7
    UC4 -.-> UC7
    UC3 -.-> INC1
    UC4 -.-> INC1
    UC1 -.-> EXT1
    UC1 -.-> EXT2
```

### Descrição dos Casos de Uso

| ID | Caso de Uso | Ator | Pré-condição |
|----|-------------|------|--------------|
| UC2.1 | Listar Usuários | Admin | Permissão `users.view` |
| UC2.2 | Visualizar Usuário | Admin | Permissão `users.view` |
| UC2.3 | Criar Usuário | Admin | Permissão `users.create`. Dados validados via `StoreUserRequest` |
| UC2.4 | Editar Usuário | Admin | Permissão `users.edit.all` ou `users.edit.self` (somente próprio) |
| UC2.5 | Excluir Usuário | Admin | Permissão `users.delete`. SoftDelete |
| UC2.6 | Upload Avatar | Admin | Arquivo `image/jpeg,png` ≤ 2MB |
| UC2.7 | Atribuir Grupo | Admin | Role existente no Spatie |

---

## 3. Grupos de Usuários — RBAC

**Status:** ✅ Implementado

```mermaid
flowchart LR
    Admin["🧑 Administrador"]

    UC1(["Listar Grupos\n(Roles)"])
    UC2(["Criar Grupo"])
    UC3(["Editar Grupo"])
    UC4(["Excluir Grupo"])
    UC5(["Listar Permissões\nDisponíveis"])
    UC6(["Selecionar Permissões\npor Categoria"])

    INC1(["«include»\nValidar Guard Name"])
    INC2(["«include»\nNormalizar IDs\nde Permissão"])

    Admin --> UC1
    Admin --> UC2
    Admin --> UC3
    Admin --> UC4
    Admin --> UC5

    UC2 -.-> UC6
    UC3 -.-> UC6
    UC2 -.-> INC1
    UC2 -.-> INC2
    UC3 -.-> INC2
```

### Descrição dos Casos de Uso

| ID | Caso de Uso | Ator | Regras |
|----|-------------|------|--------|
| UC3.1 | Listar Grupos | Admin | Permissão `roles.manage`. Retorna roles com permissões associadas |
| UC3.2 | Criar Grupo | Admin | Nome único. Permissões normalizadas para o guard correto |
| UC3.3 | Editar Grupo | Admin | Sincroniza permissões via `syncPermissions()` |
| UC3.4 | Excluir Grupo | Admin | Grupo "Administrador" protegido contra exclusão |
| UC3.5 | Listar Permissões | Admin | Lista todas as permissões disponíveis agrupadas por categoria |

---

## 4. Cadastro de Imóveis

**Status:** 🔧 Em Desenvolvimento

```mermaid
flowchart LR
    Corretor["🧑 Corretor"]
    Admin["🧑 Administrador"]

    UC1(["Listar Imóveis\n(filtros avançados)"])
    UC2(["Visualizar Imóvel"])
    UC3(["Cadastrar Imóvel\n(multi-step)"])
    UC4(["Editar Imóvel"])
    UC5(["Excluir Imóvel\n(soft delete)"])
    UC6(["Gerenciar Fotos\n(upload/reorder/capa)"])
    UC7(["Associar Comodidades\n(features)"])
    UC8(["Publicar / Destacar"])
    UC9(["Definir Exclusividade"])

    EXT1(["«extend»\nFiltrar por Tipo/Finalidade"])
    EXT2(["«extend»\nFiltrar por Preço/Área"])
    EXT3(["«extend»\nFiltrar por Bairro"])
    EXT4(["«extend»\nFiltrar por Comodidades"])
    INC1(["«include»\nValidar Exclusividade\n(data obrigatória)"])

    Corretor --> UC1
    Corretor --> UC2
    Corretor --> UC3
    Corretor --> UC4
    Corretor --> UC6
    Admin --> UC5

    UC3 -.-> UC7
    UC4 -.-> UC7
    UC3 -.-> UC8
    UC4 -.-> UC8
    UC3 -.-> UC9
    UC9 -.-> INC1
    UC1 -.-> EXT1
    UC1 -.-> EXT2
    UC1 -.-> EXT3
    UC1 -.-> EXT4
```

### Descrição dos Casos de Uso

| ID | Caso de Uso | Ator | Regras |
|----|-------------|------|--------|
| UC4.1 | Listar Imóveis | Corretor | `properties.view`. Filtros: tipo, finalidade, status, cidade, bairro, preço, quartos, comodidades |
| UC4.2 | Visualizar Imóvel | Corretor | Carrega imagens, comodidades, corretor e proprietário |
| UC4.3 | Cadastrar Imóvel | Corretor | `properties.create`. Formulário multi-step. Domínios dinâmicos via `system_enums` |
| UC4.4 | Editar Imóvel | Corretor | `properties.edit.self` (próprios) ou `properties.edit.all` (todos) |
| UC4.5 | Excluir Imóvel | Admin | `properties.delete`. SoftDelete |
| UC4.6 | Gerenciar Fotos | Corretor | Upload drag-and-drop, reordenação, definir capa. Auto-capa se primeiro upload |
| UC4.7 | Associar Comodidades | Corretor | Pivot M:N `property_feature` via `sync()` |
| UC4.8 | Publicar/Destacar | Corretor | Flags `is_published`, `is_highlighted` |
| UC4.9 | Definir Exclusividade | Corretor | Se `has_exclusive_right = true`, `exclusive_right_expiration_date` obrigatória |

---

## 5. Gestão de Leads — CRM

**Status:** 📋 Planejado

```mermaid
flowchart LR
    Corretor["🧑 Corretor"]
    Admin["🧑 Administrador"]
    Sistema["⚙️ Sistema\n(Scheduler)"]

    UC1(["Visualizar Kanban\n(leads por etapa)"])
    UC2(["Mover Card\n(drag-and-drop)"])
    UC3(["Cadastrar Lead"])
    UC4(["Visualizar Detalhes\ndo Lead"])
    UC5(["Adicionar Interação\n(nota/ligação/visita)"])
    UC6(["Enviar Mensagem\nWhatsApp/E-mail"])
    UC7(["Distribuir Lead\nAutomaticamente"])

    INC1(["«include»\nRegistrar Histórico\n(De/Para)"])
    INC2(["«include»\nCalcular\ndays_inactive"])
    INC3(["«include»\nCalcular VGV\npor Coluna"])
    EXT1(["«extend»\nRound Robin"])
    EXT2(["«extend»\nScore por\nEspecialidade"])

    Corretor --> UC1
    Corretor --> UC2
    Corretor --> UC4
    Corretor --> UC5
    Corretor --> UC6
    Admin --> UC3

    Sistema --> UC7

    UC2 -.-> INC1
    UC1 -.-> INC2
    UC1 -.-> INC3
    UC7 -.-> EXT1
    UC7 -.-> EXT2
```

### Descrição dos Casos de Uso

| ID | Caso de Uso | Ator | Regras |
|----|-------------|------|--------|
| UC5.1 | Visualizar Kanban | Corretor | `leads.view`. Cards agrupados por `FunnelStep`. Exibe `days_inactive` e VGV |
| UC5.2 | Mover Card | Corretor | `leads.manage`. Atualiza `funnel_step_id` e `status_id`. Observer gera log na `Interaction` |
| UC5.3 | Cadastrar Lead | Admin | `leads.manage`. Campos: nome, email, telefone, origem, valor esperado |
| UC5.4 | Visualizar Detalhes | Corretor | `leads.view`. Exibe timeline de interações e quick actions |
| UC5.5 | Adicionar Interação | Corretor | `leads.edit.self`. Tipo: anotação, ligação, e-mail, visita |
| UC5.6 | Enviar Mensagem | Corretor | Quick action via deep-link WhatsApp / mailto |
| UC5.7 | Distribuir Lead | Sistema | Automático ao receber novo lead. Round Robin ou Score por especialidade do corretor |

---

## 6. Gerador de Sites White-Label — B2B SaaS

**Status:** 📋 Planejado

```mermaid
flowchart LR
    Gerente["🧑 Gerente de\nImobiliária"]
    Visitante["👤 Visitante"]
    Sistema["⚙️ Sistema"]

    UC1(["Configurar Identidade\nVisual do Site"])
    UC2(["Gerenciar Domínio\n(customizado)"])
    UC3(["Selecionar Tema\n(Template)"])
    UC4(["Visualizar Histórico\nde Versões do Site"])
    UC5(["Reverter Configuração\npara Versão Anterior"])
    UC6(["Gerenciar Páginas\n(Home, Listagem, etc.)"])

    UC7(["Buscar Imóveis no Site\n(filtros públicos)"])
    UC8(["Visualizar Detalhes\ndo Imóvel"])
    UC9(["Enviar Mensagem\nde Interesse"])
    UC10(["Ver Corretores\nda Imobiliária"])

    UC11(["Provisionar Site\nAutomaticamente"])
    UC12(["Gerar URL Padrão\n(subdomínio)"])

    INC1(["«include»\nValidar Cores HEX"])
    INC2(["«include»\nValidar Tema vs\nsystem_enums"])
    INC3(["«include»\nResolver Tenant\npor Domínio"])
    EXT1(["«extend»\nExibir Imóveis da\nBase Consolidada"])

    Gerente --> UC1
    Gerente --> UC2
    Gerente --> UC3
    Gerente --> UC4
    Gerente --> UC5
    Gerente --> UC6

    Visitante --> UC7
    Visitante --> UC8
    Visitante --> UC9
    Visitante --> UC10

    Sistema --> UC11
    UC11 -.-> UC12

    UC1 -.-> INC1
    UC3 -.-> INC2
    UC7 -.-> INC3
    UC8 -.-> INC3
    UC7 -.-> EXT1
```

### Descrição dos Casos de Uso

| ID | Caso de Uso | Ator | Regras |
|----|-------------|------|--------|
| UC6.1 | Configurar Identidade Visual | Gerente | `sites.manage`. Upload logo/favicon, cores primária/secundária (hex), WhatsApp, Instagram |
| UC6.2 | Gerenciar Domínio | Gerente | Cadastrar domínio próprio. Instruções de DNS (CNAME/A). Verificação automática |
| UC6.3 | Selecionar Tema | Gerente | Validado contra `site_themes` em `system_enums` |
| UC6.4 | Visualizar Histórico | Gerente | Lista snapshots de configuração (`SiteVersion`) |
| UC6.5 | Reverter Configuração | Gerente | Restaura settings de um `SiteVersion` anterior |
| UC6.6 | Gerenciar Páginas | Gerente | Páginas obrigatórias: Home, Listagem, Informações, Corretores, Contatos |
| UC6.7 | Buscar Imóveis | Visitante | Filtros: tipo, faixa de preço, localização, quartos. Apenas `is_published = true` |
| UC6.8 | Visualizar Detalhes | Visitante | Exibe comodidades, fotos, tour virtual, corretor (dados públicos) |
| UC6.9 | Enviar Mensagem | Visitante | Formulário de contato vinculado ao imóvel de interesse |
| UC6.10 | Ver Corretores | Visitante | Lista corretores com `show_on_website = true` |
| UC6.11 | Provisionar Site | Sistema | Ao cadastrar imobiliária, cria automaticamente `TenantDomain` + `TenantSiteSetting` |

---

## 7. Pagamento Recorrente — Asaas

**Status:** ✅ Implementado

```mermaid
flowchart LR
    Gerente["🧑 Gerente de\nImobiliária"]
    Asaas["🏦 Portal Asaas\n(Webhook)"]

    UC1(["Listar Planos\nDisponíveis"])
    UC2(["Assinar Plano"])
    UC3(["Visualizar\nAssinatura Atual"])
    UC4(["Cancelar Assinatura"])
    UC5(["Escolher Forma\nde Pagamento"])

    UC6(["Processar Webhook\nPAYMENT_CONFIRMED"])
    UC7(["Processar Webhook\nPAYMENT_OVERDUE"])
    UC8(["Processar Webhook\nSUBSCRIPTION_DELETED"])

    INC1(["«include»\nCriar Customer Asaas"])
    INC2(["«include»\nCriar Subscription Asaas"])
    INC3(["«include»\nValidar Token\nWebhook"])

    Gerente --> UC1
    Gerente --> UC2
    Gerente --> UC3
    Gerente --> UC4

    UC2 -.-> UC5
    UC2 -.-> INC1
    UC2 -.-> INC2

    Asaas --> UC6
    Asaas --> UC7
    Asaas --> UC8
    UC6 -.-> INC3
    UC7 -.-> INC3
    UC8 -.-> INC3
```

### Descrição dos Casos de Uso

| ID | Caso de Uso | Ator | Regras |
|----|-------------|------|--------|
| UC7.1 | Listar Planos | Gerente | Exibe planos ativos: Mensal (R$299), Semestral (R$249/mês), Anual (R$199/mês) |
| UC7.2 | Assinar Plano | Gerente | `subscriptions.manage`. Cria Customer se não existir → Cria Subscription no Asaas |
| UC7.3 | Visualizar Assinatura | Gerente | `subscriptions.view`. Mostra status, plano, próxima cobrança |
| UC7.4 | Cancelar Assinatura | Gerente | `subscriptions.manage`. Cancela no Asaas e atualiza status local |
| UC7.5 | Escolher Pagamento | Gerente | PIX, Boleto ou Cartão de Crédito (`BillingType` enum) |
| UC7.6 | Webhook Confirmado | Asaas | Ativa assinatura (`status = active`), atualiza `next_due_date` |
| UC7.7 | Webhook Atrasado | Asaas | Inativa assinatura (`status = inactive`) |
| UC7.8 | Webhook Deletado | Asaas | Expira assinatura (`status = expired`), define `ends_at` |

---

## 8. AI Searcher — Base Consolidada de Jaraguá

**Status:** ✅ Implementado (parcial)

```mermaid
flowchart LR
    Corretor["🧑 Corretor"]
    Sistema["⚙️ Sistema\n(Scheduler)"]

    UC1(["Buscar Imóveis\nda Cidade"])
    UC2(["Filtrar Resultados"])
    UC3(["Visualizar Detalhes\n(ir ao site original)"])
    UC4(["Ver Opções\nde Filtro Disponíveis"])

    UC5(["Executar Varredura\nSemanal"])
    UC6(["Comparar Bases\n(novidades da semana)"])
    UC7(["Gerar Insights\n(bairro, m², tendências)"])
    UC8(["Visualizar Gráficos\nde Insights"])

    EXT1(["«extend»\nFiltrar por Tipo"])
    EXT2(["«extend»\nFiltrar por Valor"])
    EXT3(["«extend»\nFiltrar por Bairro/Cidade"])
    EXT4(["«extend»\nFiltrar por Quartos"])

    INC1(["«include»\nArmazenar por\nExecução de JOB"])
    INC2(["«include»\nPersistir por\n2 Meses Apenas"])

    Corretor --> UC1
    Corretor --> UC3
    Corretor --> UC4
    Corretor --> UC8

    Sistema --> UC5
    Sistema --> UC6
    Sistema --> UC7

    UC1 -.-> UC2
    UC2 -.-> EXT1
    UC2 -.-> EXT2
    UC2 -.-> EXT3
    UC2 -.-> EXT4
    UC5 -.-> INC1
    UC5 -.-> INC2
```

### Descrição dos Casos de Uso

| ID | Caso de Uso | Ator | Regras |
|----|-------------|------|--------|
| UC8.1 | Buscar Imóveis | Corretor | Listagem paginada de imóveis extraídos das imobiliárias de Jaraguá do Sul |
| UC8.2 | Filtrar Resultados | Corretor | Filtros: tipo, valor (min/max), bairro, cidade, imobiliária, quartos |
| UC8.3 | Ir ao Site Original | Corretor | Redireciona via `link_imovel` para publicação original |
| UC8.4 | Opções de Filtro | Corretor | Endpoint `/filters` retorna valores distintos para cada campo |
| UC8.5 | Varredura Semanal | Sistema | JOB semanal. Cada execução armazenada em tabela separada |
| UC8.6 | Comparar Bases | Sistema | Compara execuções para identificar novos imóveis da semana |
| UC8.7 | Gerar Insights | Sistema | Extrai: bairro em crescimento, m² mais caro, concentração de imobiliárias |
| UC8.8 | Visualizar Gráficos | Corretor | Gráficos visuais dos insights gerados |

---

## 9. Ecossistema de Integração

**Status:** 📋 Planejado

```mermaid
flowchart LR
    Gerente["🧑 Gerente de\nImobiliária"]
    Sistema["⚙️ Sistema\n(Scheduler)"]
    Portal["🌐 Portal Externo\n(ZAP/VivaReal/OLX)"]

    UC1(["Exportar Imóveis\npara Portais"])
    UC2(["Acompanhar Status\nde Exportação"])
    UC3(["Visualizar Relatórios\nde Importação"])
    UC4(["Configurar\nIntegrações"])

    UC5(["Gerar Feed XML\nVRSync"])
    UC6(["Processar Feed\n(2x ao dia)"])
    UC7(["Receber Lead\nvia Webhook"])
    UC8(["Integrar Lead\nao CRM"])

    INC1(["«include»\nGerar XML com\nIPTU/Preço/Área"])
    INC2(["«include»\nValidar Credenciais\ndo Portal"])

    Gerente --> UC1
    Gerente --> UC2
    Gerente --> UC3
    Gerente --> UC4

    Sistema --> UC5
    Sistema --> UC6

    Portal --> UC7

    UC5 -.-> INC1
    UC1 -.-> INC2
    UC7 -.-> UC8
    UC6 -.-> UC5
```

### Descrição dos Casos de Uso

| ID | Caso de Uso | Ator | Regras |
|----|-------------|------|--------|
| UC9.1 | Exportar Imóveis | Gerente | Seleciona portais destino. Gera feed XML VRSync conforme especificação Grupo OLX |
| UC9.2 | Acompanhar Status | Gerente | Visualiza status do último processamento por portal |
| UC9.3 | Relatórios de Importação | Gerente | Relatórios por e-mail, webhook e painel. Total, sucesso, falhas |
| UC9.4 | Configurar Integrações | Gerente | Tokens de API, endpoints, ativar/desativar por portal |
| UC9.5 | Gerar Feed XML | Sistema | Formato VRSync: IPTU, preço venda/aluguel, taxa admin, tipo, área, quartos, garagens |
| UC9.6 | Processar Feed | Sistema | Job a cada 12h (2x/dia). Alterações, inclusões e exclusões refletidas nos portais |
| UC9.7 | Receber Lead | Portal | Webhook dos portais → CRM Partner Integration / Meta Graph API |
| UC9.8 | Integrar ao CRM | Sistema | Lead automaticamente inserido no CRM com origem = portal |

---

## Legenda

| Símbolo | Significado |
|---------|-------------|
| 🧑 | Ator humano do sistema |
| ⚙️ | Ator sistema (processo automatizado) |
| 🏦 / 🌐 | Ator externo (API/Portal) |
| `(["..."])` | Caso de Uso |
| `-->` | Associação Ator → Caso de Uso |
| `-.->` | Relacionamento `«include»` ou `«extend»` |
| 📋 Planejado | Módulo especificado, não implementado |
| ✅ Implementado | Módulo funcional no código-fonte |
| 🔧 Em Desenvolvimento | Módulo parcialmente implementado |
