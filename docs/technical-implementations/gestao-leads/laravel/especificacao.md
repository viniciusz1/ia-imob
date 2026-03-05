# Especificação Técnica: Backend (Laravel) - Gestão de Leads

## 1. Visão Geral
Este documento detalha a arquitetura do backend para o módulo de Gestão de Leads, centralizando a captura, qualificação e conversão de potenciais clientes. O sistema visa garantir que nenhum lead fique sem atendimento através de automação. A implementação segue as diretrizes do projeto (Laravel 11+, PostgreSQL, Sanctum, Service-Repository Pattern).

## 2. Modelagem de Dados e Banco de Dados (Migrations & Models)

### 2.1 Entidades Principais
*   **Lead**: Armazena dados do interessado.
    *   Campos base: `name`, `email`, `phone`, `origin`, `status_id`.
    *   **NOVO CAMPO (Sincronizado Next.js)**: `expected_value` (decimal/money) (VGV da negociação).
    *   Chaves estrangeiras: `funnel_step_id` (etapa do kanban), `user_id` (corretor associado/dono do atendimento).
    *   Traits: `SoftDeletes`. Campos padrões: `created_at`, `updated_at`, `deleted_at`.
*   **FunnelStep**: Define as etapas do Kanban (ex: Novo, Contato Realizado, Visita Agendada, Proposta, Fechado).
*   **Interaction**: Tabela polimórfica (ou direta) para registrar histórico: e-mails, logs de WhatsApp, anotações de chamadas e visitas.
*   **User (Broker)**: Relacionamento nativo de usuários indicando o "dono" do lead na entidade.

### 2.2 Índices
*   Os campos altamente buscados e agrupados, como `funnel_step_id`, `user_id`, `status_id`, precisam ter chaves de índice documentadas nas migrations para ganho de performance em paginações e ordenações.

## 3. Arquitetura de Software (Padrões Action / Service)

### 3.1 Controller: `LeadController` / `KanbanController`
*   Devem ser estritamente pequenos, responsáveis unicamente por repassar os payloads validados mediante Form Requests para as Actions aplicáveis e encapsular a resposta em API Resources.

### 3.2 Lógica de Distribuição Automática (The "Dispatcher")
*   **`LeadDistributionService`**: Contém a essência de atribuição.
    *   **Modo Round Robin (Roleta)**: Um ponteiro no banco de dados acompanha qual corretor é o próximo da fila (levando em conta disponibilidade, seções e faltas). Recepciona e atribui à próxima conta.
    *   **Especialidade/Score**: Caso os leads venham rotulados/tagueados (Ex: Alto Padrão, Aluguel), executa filtro no perfil dos corretores correspondentes com prioridade de repasse.

### 3.3 Engine de Histórico
*   Eventos ou **Model Observers**. Ao disparar mudanças em campos fulcrais de `Lead` (`status_id`, `user_id`, `funnel_step_id`), um "Observer" (ex: `LeadObserver::updated`) reage gerando um log "De/Para" automaticamente no relacionamento da tabela `interactions`.

## 4. Endpoints e Requisições API (RESTful)
Toda interação é protegida por token Sanctum e middleware de validação.
*   `GET /api/leads/kanban`: Retorna leads mapeados por etapa do funil (`funnel_step_id`). Usar tipicamente ResourceCollections.
*   `PATCH /api/leads/{id}/status`: Executa a movimentação Drag & Drop de cards visuais (atualizando `funnel_step_id` e status). Aciona internamente o histórico Engine.
*   `POST /api/leads/{id}/interactions`: Endpoint encarregado de injetar na timeline notas customizadas dos corretores.

## 5. Validação de Dados (Form Requests) e Output
*   **API Resources Estritos**: Saída envelopada. O `KanbanResource` fará a formatação pré-processada evitando cálculos no frontend (exemplo: agrupar cards nas devidas colunas).
    *   **NOVO ATRIBUTO VIRTUAL (Sincronizado Next.js)**: O array correspondente ao `Lead` retornado no `KanbanResource` deve injetar e expor um processamento pronto de `days_inactive: int` originado do seu relacionamento com `Interaction`, aliviando cálculos no front.

## 6. Permissões e Base Dinâmica (Seeder/Enums)
*   **`SystemEnumSeeder`**: Alimentado inicialmente com os status de leads, tags e agrupamentos de origens através deste seeder de base, não *hardcoded*.
*   **`PermissionSeeder`**: Exigência de mapear as *Roles* como `leads.view`, `leads.manage`, `leads.edit.self` entre outras, espelhando com a nova `LeadPolicy`.

## 7. Otimização e Performance
*   Prevenção contínua de rotinas N+1 dentro das buscas atráves de chamadas do tipo Eager Loading pelo Repository: `$query->with(['user', 'funnelStep', 'latestInteraction'])`. A extração do kanban poderá envolver volumes intensos de leitura.
