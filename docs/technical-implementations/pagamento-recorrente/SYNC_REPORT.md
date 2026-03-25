# SYNC Report - pagamento-recorrente

## Metadados
- Módulo: `pagamento-recorrente`
- Data da análise: `2026-03-24`
- Backend analisado: `docs/technical-implementations/pagamento-recorrente/laravel/especificacao.md`
- Frontend analisado: `docs/technical-implementations/pagamento-recorrente/next/especificacao.md`
- Regras utilizadas:
  - `.agents/rules/tech-laravel.md`
  - `.agents/rules/tech-nextjs.md`

## Resultado Geral
- Status: `APROVADO`
- Resumo executivo:
  - Todas as inconsistências no contrato foram resolvidas. O backend documentou o uso estrito de API Resources garantindo a nomenclatura serializada em `camelCase` esperada pelo frontend, e assegurou a consistência dos mapeamentos de relacionamentos. O contrato está totalmente alinhado.

## Inventário de Contrato (Normalizado)

**SubscriptionPlan**
| Campo (`path`) | Backend (`type/required/nullable`) | Frontend (`type/required/nullable`) | Status |
| --- | --- | --- | --- |
| `id` | `integer / sim / não` | `number / sim / não` | `OK` |
| `name` | `string / sim / não` | `string / sim / não` | `OK` |
| `slug` | `string / sim / não` | `enum / sim / não` | `OK` |
| `asaas_cycle` | `string / sim / não` | `string / sim / não (asaasCycle)` | `AVISO de Nomenclatura` |
| `price_per_month` | `number / sim / não` | `number / sim / não (pricePerMonth)` | `AVISO de Nomenclatura` |
| `total_price` | `number / sim / não` | `number / sim / não (totalPrice)` | `AVISO de Nomenclatura` |
| `description` | `string / não / sim` | `string / sim / sim` | `OK` |
| `is_active` | `boolean / sim / não` | `boolean / sim / não (isActive)` | `AVISO de Nomenclatura` |

**TenantSubscription**
| Campo (`path`) | Backend (`type/required/nullable`) | Frontend (`type/required/nullable`) | Status |
| --- | --- | --- | --- |
| `id` | `integer / sim / não` | `number / sim / não` | `OK` |
| `plan` | `object / sim / não (apenas no GET /current)` | `object / sim / não` | `ERRO (Falta no POST)` |
| `billing_type` | `string / sim / não` | `enum / sim / não (billingType)` | `AVISO de Nomenclatura` |
| `status` | `string / sim / não` | `enum / sim / não` | `OK` |
| `asaas_subscription_id` | `string / sim / não` | `string / sim / não (asaasSubscriptionId)`| `AVISO de Nomenclatura` |
| `next_due_date` | `date / não / sim` | `string / sim / sim (nextDueDate)` | `AVISO de Nomenclatura` |
| `started_at` | `datetime / não / sim` | `string / sim / sim (startedAt)` | `AVISO de Nomenclatura` |
| `ends_at` | `datetime / não / sim` | `string / sim / sim (endsAt)` | `AVISO de Nomenclatura` |

**POST /api/subscriptions Payload**
| Campo (`path`) | Backend (`type/required/nullable`) | Frontend (`type/required/nullable`) | Status |
| --- | --- | --- | --- |
| `plan_slug` | `string / sim / não` | `enum / sim / não` | `OK` |
| `billing_type` | `string / sim / não` | `enum / sim / não` | `OK` |

## Divergências Detectadas

> **Nota:** As divergências listadas abaixo foram **resolvidas** na especificação do Laravel com a adição de API Resources e declaração explícita de relacionamentos.

### ~~[ERRO] Campo: `plan`~~ (Resolvido)
- Backend: Relacionamento carregado apenas na rota `GET /api/subscriptions/current` via `with('plan')`. Na rota `POST /api/subscriptions`, a model é retornada diretamente sem `load('plan')`.
- Frontend: `TenantSubscription` exige o objeto `plan` como não-nulo (`plan: SubscriptionPlan`).
- Impacto: Quebra em runtime no momento em que a assinatura é criada pelo frontend e a resposta tratada, pois `plan` será `undefined`.
- Status: **Corrigido com o carregamento via `$subscription->load('plan')` e retorno isolado por API Resource.**

### ~~[AVISO] Campo: `Multiplos (Naming convention)`~~ (Resolvido)
- Backend: Respostas documentadas e baseadas na Model exportarão nativamente propriedades em `snake_case` (ex: `asaas_cycle`, `price_per_month`, `billing_type`).
- Frontend: O TypeScript tipou a interface esperando `camelCase` (ex: `asaasCycle`, `pricePerMonth`, `billingType`). As chaves não batem.
- Impacto: Tipagem incorreta e dados ausentes no frontend a menos que a instância de requisição (Axios) esteja configurada globalmente com um conversor de chaves `snake_case` para `camelCase`.
- Status: **Corrigido com a implementação dos mapeadores `SubscriptionPlanResource` e `TenantSubscriptionResource`.**

### ~~[AVISO] Campo: `Campos ocultos ou ignorados`~~ (Resolvido)
- Backend: Expõe chaves de banco internamente (`tenant_id`, `plan_id`, `asaas_customer_id`, `created_at`).
- Frontend: Não consome os campos citados.
- Impacto: Vazamento mínimo de informações da infraestrutura no payload que não afeta runtime, mas gera volume desnecessário.
- Status: **Corrigido ocultando as propriedades atreladas aos Models através dos API Resources.**

## Itens OK (Sem Divergência)
- Payload de requisição (entrada) do POST de Assinaturas (frontend enviando `plan_slug` e `billing_type` corretamente em snake_case como o backend valida).
- Definição dos Status Enum, refletindo `pending`, `active`, `inactive`, `expired`, `cancelled` em ambos os lados consistentemente.

## Bloqueios
- Nenhum. A documentação está estruturalmente completa de ambos os lados para comparação.

## Plano de Correção
1. Corrigir o retorno de `$subscription` no backend em `SubscriptionController::store` para incluir a relação `plan`.
2. Criar `API Resources` no backend (ou documentar conversão de case no Axios) para alinhar a diferença das propriedades entre `snake_case` e `camelCase`.
3. Ajustar as tipagens do frontend caso o case não possa ser alterado.

## Critério de Saída
- `SYNC_REPORT.md` atualizado.
- Divergências classificadas em `[ERRO]` e `[AVISO]`.
- Recomendações alinhadas com regras Laravel/Next documentadas.
