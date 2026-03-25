# Pagamento Recorrente — Especificação Técnica Frontend (Next.js)

## Visão Geral

Módulo de gerenciamento de assinatura do plano SaaS da imobiliária. Acessível via `/dashboard/billing`, permite ao administrador da imobiliária escolher um plano, selecionar o método de pagamento, confirmar a assinatura e acompanhar o status.

---

## 1. Estrutura de Arquivos

```
src/
├── app/
│   └── (dashboard)/
│       └── billing/
│           └── page.tsx                     ← Rota principal
│
└── components/
    └── features/
        └── billing/
            ├── BillingPage.tsx              ← Client component principal
            ├── CurrentSubscriptionBanner.tsx← Banner de assinatura ativa
            ├── PlanSelector.tsx             ← Grid de seleção de planos
            ├── PlanCard.tsx                 ← Card individual de plano
            ├── BillingTypeSelector.tsx      ← Seletor do método de pagamento
            └── SubscriptionConfirmModal.tsx ← Modal de confirmação
```

---

## 2. Tipos TypeScript

```typescript
// src/types/billing.ts

export type PlanSlug = 'monthly' | 'semiannual' | 'annual';
export type BillingType = 'BOLETO' | 'CREDIT_CARD' | 'PIX';
export type SubscriptionStatus = 'pending' | 'active' | 'inactive' | 'expired' | 'cancelled';

export interface SubscriptionPlan {
  id: number;
  name: string;
  slug: PlanSlug;
  asaasCycle: string;
  pricePerMonth: number;   // valor exibido por mês
  totalPrice: number;      // valor cobrado na recorrência
  description: string | null;
  isActive: boolean;
}

export interface TenantSubscription {
  id: number;
  plan: SubscriptionPlan;
  billingType: BillingType;
  status: SubscriptionStatus;
  asaasSubscriptionId: string;
  nextDueDate: string | null;
  startedAt: string | null;
  endsAt: string | null;
}

// Payload para POST /api/subscriptions
export interface SubscriptionCreatePayload {
  plan_slug: PlanSlug;
  billing_type: BillingType;
}
```

---

## 3. API Calls (Funções de Serviço)

```typescript
// src/services/billing.ts

import { apiClient } from '@/lib/axios'; // instância Axios já configurada

export async function fetchPlans(): Promise<SubscriptionPlan[]> {
  const { data } = await apiClient.get('/plans');
  return data;
}

export async function fetchCurrentSubscription(): Promise<TenantSubscription | null> {
  const { data } = await apiClient.get('/subscriptions/current');
  return data;
}

export async function createSubscription(
  payload: SubscriptionCreatePayload
): Promise<TenantSubscription> {
  const { data } = await apiClient.post('/subscriptions', payload);
  return data;
}

export async function cancelSubscription(id: number): Promise<void> {
  await apiClient.delete(`/subscriptions/${id}`);
}
```

---

## 4. Rota — `app/(dashboard)/billing/page.tsx`

Server Component. Busca os planos e a assinatura atual server-side.

```tsx
import { BillingPage } from '@/components/features/billing/BillingPage';
import { fetchPlans, fetchCurrentSubscription } from '@/services/billing';

export const metadata = {
  title: 'Planos e Assinatura — ia-imob',
  description: 'Gerencie o plano de assinatura da sua imobiliária.',
};

export default async function BillingRoute() {
  const [plans, currentSubscription] = await Promise.all([
    fetchPlans(),
    fetchCurrentSubscription(),
  ]);

  return (
    <BillingPage
      plans={plans}
      currentSubscription={currentSubscription}
    />
  );
}
```

---

## 5. Componentes

### 5.1. `BillingPage.tsx` — Client Component Principal

**Responsabilidades:**
- Gerenciar estado de seleção de plano, método de pagamento e abertura do modal
- Renderizar `CurrentSubscriptionBanner` (se ativo) ou `PlanSelector` (se sem assinatura)

**Estado:**
```typescript
const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
const [billingType, setBillingType] = useState<BillingType>('PIX');
const [confirmOpen, setConfirmOpen] = useState(false);
const [isLoading, setIsLoading] = useState(false);
```

**Fluxo de submit:**
```typescript
async function handleConfirm() {
  setIsLoading(true);
  try {
    const subscription = await createSubscription({
      plan_slug: selectedPlan!.slug,
      billing_type: billingType,
    });
    // Redirecionar para link de pagamento Asaas (boleto/PIX)
    // ou atualizar a página se cartão foi processado inline
    router.refresh();
    toast.success('Assinatura criada! Realize o pagamento para ativar.');
  } catch (e) {
    toast.error('Erro ao criar assinatura. Tente novamente.');
  } finally {
    setIsLoading(false);
    setConfirmOpen(false);
  }
}
```

---

### 5.2. `PlanCard.tsx`

Exibe um único plano. Deve receber:

| Prop | Tipo | Descrição |
|------|------|-----------|
| `plan` | `SubscriptionPlan` | Dados do plano |
| `isSelected` | `boolean` | Borda/highlight de seleção |
| `onSelect` | `() => void` | Callback de seleção |
| `isMostPopular?` | `boolean` | Exibe badge "Mais Popular" |

**Layout do card:**
```
┌────────────────────────────────────┐
│  🔖 MAIS POPULAR (badge opcional)  │
│                                    │
│  Plano Semestral                   │
│  R$ 249/mês ← pricePerMonth        │
│  Cobrado R$ 1.494,00 a cada 6 meses│
│                                    │
│  ✓ Feature 1                       │
│  ✓ Feature 2                       │
│                                    │
│  [   Selecionar Plano   ]          │
└────────────────────────────────────┘
```

---

### 5.3. `PlanSelector.tsx`

Grid de 3 colunas com os `PlanCard`s.

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {plans.map((plan) => (
    <PlanCard
      key={plan.id}
      plan={plan}
      isSelected={selectedPlan?.id === plan.id}
      onSelect={() => setSelectedPlan(plan)}
      isMostPopular={plan.slug === 'semiannual'}
    />
  ))}
</div>
```

Abaixo do grid: `BillingTypeSelector` e botão "Continuar" (habilitado só após selecionar plano).

---

### 5.4. `BillingTypeSelector.tsx`

Seletor de método de pagamento com 3 opções (radio buttons estilizados com ícones):

| Valor | Label | Ícone sugerido |
|-------|-------|----------------|
| `PIX` | Pix | `QrCode` (lucide) |
| `BOLETO` | Boleto Bancário | `FileText` (lucide) |
| `CREDIT_CARD` | Cartão de Crédito | `CreditCard` (lucide) |

> **Importante:** Para `CREDIT_CARD`, o Asaas pode exigir dados de cartão. Na versão inicial, redirecionar para o link de checkout do Asaas. Implementação inline com tokenização pode ser feita em iteração futura.

---

### 5.5. `CurrentSubscriptionBanner.tsx`

Exibido quando há assinatura ativa. Mostra:

```
┌────────────────────────────────────────────────────┐
│  ✅ Plano Semestral                    [ACTIVE]     │
│  Próxima cobrança: 15/09/2026                      │
│  Método: PIX                                       │
│                             [Cancelar Assinatura]  │
└────────────────────────────────────────────────────┘
```

Ao clicar em "Cancelar Assinatura": exibir `AlertDialog` de confirmação, depois chamar `cancelSubscription(id)` e refresh da página.

---

### 5.6. `SubscriptionConfirmModal.tsx`

Dialog de confirmação antes de finalizar. Exibe:
- Nome do plano selecionado
- Valor cobrado e ciclo
- Método de pagamento
- Botões: "Voltar" e "Confirmar Assinatura" (com loading spinner)

---

## 6. Tratamento de Status da Assinatura

| Status | Comportamento no Frontend |
|--------|---------------------------|
| `pending` | Banner amarelo: "Aguardando confirmação do pagamento" |
| `active` | `CurrentSubscriptionBanner` verde |
| `inactive` | Banner laranja: "Pagamento atrasado — regularize para manter o acesso" |
| `expired` / `cancelled` | Exibir `PlanSelector` novamente (como se não tivesse assinatura) |

---

## 7. Permissões

- A rota `/dashboard/billing` deve ser protegida por middleware de autenticação
- O botão de cancelamento só deve ser exibido para usuários com permissão `subscriptions.manage`

---

## 8. Checklist de Implementação

- [ ] Criar tipos em `src/types/billing.ts`
- [ ] Criar funções de serviço em `src/services/billing.ts`
- [ ] Criar rota `app/(dashboard)/billing/page.tsx`
- [ ] Implementar `PlanCard`
- [ ] Implementar `PlanSelector`
- [ ] Implementar `BillingTypeSelector`
- [ ] Implementar `SubscriptionConfirmModal`
- [ ] Implementar `CurrentSubscriptionBanner`
- [ ] Implementar `BillingPage` (orquestra tudo)
- [ ] Adicionar rota "Plano & Assinatura" ao sidebar do dashboard
- [ ] Testar fluxo completo com sandbox Asaas
