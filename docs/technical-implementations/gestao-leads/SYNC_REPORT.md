# Relatório de Sincronização de API: Gestão de Leads (SYNC_REPORT)
**Módulo:** Gestão de Leads
**Data da Análise:** 02/03/2026

Este relatório sinaliza os resultados da análise de consistência e integridade dos dados e contratos definidos na documentação técnica do backend (Laravel) e frontend (Next.js) do módulo de Gestão de Leads.

---

## 🔍 Phase 1: Data Extraction (Mining)

### Backend (Laravel) - `docs/gestao-leads/laravel/especificacao.md`
**Modelo `Lead` mapeado (principais campos):**
*   `name` (string)
*   `email` (string)
*   `phone` (string)
*   `origin` (string)
*   `status_id` (foreign key)
*   `funnel_step_id` (foreign key)
*   `user_id` (foreign key - dono)
*   `created_at`, `updated_at`, `deleted_at` (timestamps)

**Requests / Endpoints Mapeados:**
*   `GET /api/leads/kanban` (Busca com: `user`, `funnelStep`, `latestInteraction`)
*   `PATCH /api/leads/{id}/status`
*   `POST /api/leads/{id}/interactions`

### Frontend (Next.js) - `docs/gestao-leads/next/especificacao.md`
**Campos exigidos pela Interface (Kanban e LeadCard):**
*   `Total de leads` e `Soma de valor potencial (VGV)` (Obrigatório na KanbanColumn).
*   `nome`, `indicadores (Inativo há X dias)` (Obrigatório no LeadCard).
*   `Timeline` (Interactions formadas por "De -> Para" ou manuais).

---

## ⚖️ Phase 2: Structural Analysis (Cross-Check) & Mismatch Detection

### 1. [ERRO - MISSING FIELD] Campo de Valor / VGV no Backend
*   **Descrição:** O frontend exige a exibição da "Soma de valor potencial (VGV)" na coluna do Kanban (`<KanbanColumn />`), porém o modelo `Lead` no Laravel não previu nenhum campo financeiro (ex: `expected_value`, `budget`, ou `vgv`).
*   **Impacto:** O Next.js não terá como calcular o somatório na coluna sem esse dado exposto na API.
*   **Ação Proposta (Backend):** Adicionar um campo `expected_value` (decimal/money) à migration e model do `Lead` no Laravel. Além disso, expor este campo via `LeadResource` / `KanbanResource`.

### 2. [AVISO - MISSING DEFINITION] Contratos e Schemas Zod no Next.js
*   **Descrição:** A documentação do Front-end (`next/especificacao.md`) não aprofundou as assinaturas de 타입/Zod para os formulários de interação e mutação de status.
*   **Impacto:** Falta de Single Source of Truth estrita na validação do Next.js.
*   **Ação Proposta (Frontend):** Atualizar a documentação do Next.js para incluir explicitamente o payload esperado (Ex: `UpdateLeadStatusSchema` exigindo `funnel_step_id: z.number().int()`).

### 3. [AVISO - DTO/API MAPPING] Cálculo de "Inatividade"
*   **Descrição:** O `<LeadCard />` necessita exibir tempo de inatividade ("Inativo há X dias").
*   **Impacto:** O frontend precisará processar as datas baseado na `latestInteraction` retornada pelo backend.
*   **Ação Proposta (Cross-Stack):** Certificar que o `KanbanResource` do Laravel já compute o `last_interaction_at` (ou `days_inactive`) no servidor para enviar esse dado pronto, evitando processamento extra de datas (exemplo via `Carbon`) no Next.js. O payload de saída da API deve adicionar o atributo virtual `days_inactive: int`.

---

## 🛠️ Phase 3: Architectural Proposal & Next Steps

Para que os contratos fiquem perfeitamente alinhados antes do desenvolvimento, sugere-se as seguintes correções na documentação:

1. **No Laravel (`laravel/especificacao.md`)**:
   * Adicionar à lista de campos da Entidade Principal "Lead": `expected_value (decimal, nullable)` para representar o VGV.
   * Modificar o output em "API Resources Estritos" para que o `KanbanResource` entregue no JSON o atributo derivado/calculado `days_inactive`.

2. **No Next.js (`next/especificacao.md`)**:
   * Especificar os Schemas Zod fundamentais (`UpdateLeadStatusSchema`, `InteractionSchema`), mapeando os campos como `expected_value: z.number().optional()`.
