# Pagamento Recorrente — Especificação Técnica Backend (Laravel)

## Visão Geral

Integração com a API [Asaas](https://asaas.com) para cobrança recorrente dos planos SaaS do ia-imob. O backend é responsável por:
1. Sincronizar o cliente (Tenant) com a Asaas (`Customer`)
2. Criar/cancelar assinaturas (`Subscription`)
3. Receber e processar webhooks de eventos de pagamento
4. Expor endpoints para o frontend consultar e gerenciar a assinatura

---

## 1. Configuração

### Variáveis de Ambiente

```env
ASAAS_API_TOKEN=your_asaas_api_token
ASAAS_WEBHOOK_TOKEN=your_asaas_webhook_token
ASAAS_BASE_URL=https://api-sandbox.asaas.com   # trocar para prod em produção
```

### `config/services.php`

```php
'asaas' => [
    'token'         => env('ASAAS_API_TOKEN'),
    'webhook_token' => env('ASAAS_WEBHOOK_TOKEN'),
    'base_url'      => env('ASAAS_BASE_URL', 'https://api-sandbox.asaas.com'),
],
```

---

## 2. Modelo de Dados

### 2.1. Tabela `subscription_plans` (seeded, não editável pelo usuário)

```sql
CREATE TABLE subscription_plans (
    id               BIGSERIAL PRIMARY KEY,
    name             VARCHAR(100) NOT NULL,          -- "Plano Mensal"
    slug             VARCHAR(50)  NOT NULL UNIQUE,   -- "monthly" | "semiannual" | "annual"
    asaas_cycle      VARCHAR(20)  NOT NULL,          -- "MONTHLY" | "SEMIANNUALLY" | "YEARLY"
    price_per_month  NUMERIC(10,2) NOT NULL,         -- valor exibido ao cliente por mês
    total_price      NUMERIC(10,2) NOT NULL,         -- valor cobrado pela Asaas na recorrência
    description      TEXT,
    is_active        BOOLEAN DEFAULT TRUE,
    created_at       TIMESTAMP,
    updated_at       TIMESTAMP
);
```

**Seed inicial:**

| slug | name | asaas_cycle | price_per_month | total_price |
|------|------|-------------|-----------------|-------------|
| monthly | Plano Mensal | MONTHLY | 299.00 | 299.00 |
| semiannual | Plano Semestral | SEMIANNUALLY | 249.00 | 1494.00 |
| annual | Plano Anual | YEARLY | 199.00 | 2388.00 |

> **Nota:** Os preços acima são sugestivos. Ajustar nos seeders antes de ir para produção.

---

### 2.2. Tabela `tenant_subscriptions`

```sql
CREATE TABLE tenant_subscriptions (
    id                      BIGSERIAL PRIMARY KEY,
    tenant_id               BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id                 BIGINT NOT NULL REFERENCES subscription_plans(id),
    asaas_customer_id       VARCHAR(50),      -- ex: "cus_0T1mdomVMi39"
    asaas_subscription_id   VARCHAR(50),      -- ex: "sub_VXJBYgP2u0eO"
    billing_type            VARCHAR(20) NOT NULL, -- "BOLETO" | "CREDIT_CARD" | "PIX"
    status                  VARCHAR(20) NOT NULL DEFAULT 'pending',
                                              -- pending | active | inactive | expired | cancelled
    next_due_date           DATE,
    started_at              TIMESTAMP,
    ends_at                 TIMESTAMP,        -- NULL = sem data fim (recorrência contínua)
    created_at              TIMESTAMP,
    updated_at              TIMESTAMP
);
```

> **Regra:** Um tenant deve ter no máximo **uma** assinatura ativa por vez.
> Aplicar unique constraint: `UNIQUE (tenant_id)` WHERE `status IN ('pending', 'active')`.

---

## 3. Serviços

### 3.1. `App\Services\AsaasService`

Cliente HTTP wrapper da API Asaas. Todas as chamadas são encapsuladas aqui.

```php
namespace App\Services;

use Illuminate\Support\Facades\Http;

class AsaasService
{
    private string $baseUrl;
    private string $token;

    public function __construct()
    {
        $this->baseUrl = config('services.asaas.base_url');
        $this->token   = config('services.asaas.token');
    }

    private function client(): \Illuminate\Http\Client\PendingRequest
    {
        return Http::baseUrl($this->baseUrl)
            ->withHeader('access_token', $this->token)
            ->acceptJson();
    }

    // ─── Customer ─────────────────────────────────────────────────────────────

    /** POST /v3/customers */
    public function createCustomer(array $data): array
    {
        // Required: name, cpfCnpj
        // Optional: email, phone, mobilePhone, externalReference
        return $this->client()->post('/v3/customers', $data)->throw()->json();
    }

    /** GET /v3/customers/{id} */
    public function getCustomer(string $customerId): array
    {
        return $this->client()->get("/v3/customers/{$customerId}")->throw()->json();
    }

    // ─── Subscription ─────────────────────────────────────────────────────────

    /**
     * POST /v3/subscriptions
     *
     * Required: customer, billingType, value, nextDueDate, cycle
     * Optional: description, externalReference, endDate, maxPayments, discount, fine, interest
     */
    public function createSubscription(array $data): array
    {
        return $this->client()->post('/v3/subscriptions', $data)->throw()->json();
    }

    /** DELETE /v3/subscriptions/{id} */
    public function cancelSubscription(string $subscriptionId): array
    {
        return $this->client()->delete("/v3/subscriptions/{$subscriptionId}")->throw()->json();
    }

    /** GET /v3/subscriptions/{id} */
    public function getSubscription(string $subscriptionId): array
    {
        return $this->client()->get("/v3/subscriptions/{$subscriptionId}")->throw()->json();
    }

    /** GET /v3/subscriptions/{id}/payments */
    public function getSubscriptionPayments(string $subscriptionId): array
    {
        return $this->client()->get("/v3/subscriptions/{$subscriptionId}/payments")->throw()->json();
    }
}
```

---

### 3.2. `App\Services\SubscriptionService`

Lógica de negócio que orquestra as chamadas ao `AsaasService` e persiste os dados localmente.

```php
namespace App\Services;

use App\Models\Tenant;
use App\Models\SubscriptionPlan;
use App\Models\TenantSubscription;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class SubscriptionService
{
    public function __construct(private AsaasService $asaas) {}

    /**
     * Cria ou recupera o Customer no Asaas e cria a assinatura.
     * Retorna o modelo TenantSubscription salvo.
     */
    public function subscribe(
        Tenant $tenant,
        SubscriptionPlan $plan,
        string $billingType // BOLETO | CREDIT_CARD | PIX
    ): TenantSubscription {
        return DB::transaction(function () use ($tenant, $plan, $billingType) {

            // 1. Criar ou recuperar Customer no Asaas
            $asaasCustomerId = $tenant->asaas_customer_id;

            if (!$asaasCustomerId) {
                $customer = $this->asaas->createCustomer([
                    'name'              => $tenant->name,
                    'cpfCnpj'           => $tenant->cpf_cnpj,  // campo obrigatório
                    'email'             => $tenant->email,
                    'externalReference' => (string) $tenant->id,
                ]);
                $asaasCustomerId = $customer['id'];
                $tenant->update(['asaas_customer_id' => $asaasCustomerId]);
            }

            // 2. Criar Subscription no Asaas
            $subscription = $this->asaas->createSubscription([
                'customer'          => $asaasCustomerId,
                'billingType'       => $billingType,
                'value'             => $plan->total_price,
                'nextDueDate'       => Carbon::today()->format('Y-m-d'),
                'cycle'             => $plan->asaas_cycle,
                'description'       => "ia-imob — {$plan->name}",
                'externalReference' => (string) $tenant->id,
            ]);

            // 3. Persistir localmente
            return TenantSubscription::create([
                'tenant_id'             => $tenant->id,
                'plan_id'               => $plan->id,
                'asaas_customer_id'     => $asaasCustomerId,
                'asaas_subscription_id' => $subscription['id'],
                'billing_type'          => $billingType,
                'status'                => 'pending',         // ativado pelo webhook
                'next_due_date'         => $subscription['nextDueDate'],
            ]);
        });
    }

    /** Cancela a assinatura no Asaas e atualiza o status local. */
    public function cancel(TenantSubscription $tenantSubscription): void
    {
        $this->asaas->cancelSubscription($tenantSubscription->asaas_subscription_id);

        $tenantSubscription->update([
            'status'  => 'cancelled',
            'ends_at' => Carbon::now(),
        ]);
    }
}
```

---

## 4. Controllers

### 4.1. `SubscriptionController`

```php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SubscriptionStoreRequest;
use App\Models\SubscriptionPlan;
use App\Services\SubscriptionService;
use Illuminate\Http\JsonResponse;

class SubscriptionController extends Controller
{
    public function __construct(private SubscriptionService $service) {}

    /** GET /api/subscriptions/current */
    public function current()
    {
        $subscription = auth()->user()->tenant
            ->subscriptions()
            ->with('plan')
            ->where('status', 'active')
            ->first();

        if (!$subscription) {
            return response()->json(null);
        }

        return new \App\Http\Resources\TenantSubscriptionResource($subscription);
    }

    /** POST /api/subscriptions */
    public function store(SubscriptionStoreRequest $request)
    {
        $plan = SubscriptionPlan::where('slug', $request->plan_slug)->firstOrFail();

        $subscription = $this->service->subscribe(
            tenant: auth()->user()->tenant,
            plan: $plan,
            billingType: $request->billing_type,
        );

        $subscription->load('plan');

        return (new \App\Http\Resources\TenantSubscriptionResource($subscription))
            ->response()
            ->setStatusCode(201);
    }

    /** DELETE /api/subscriptions/{id} */
    public function destroy(int $id): JsonResponse
    {
        $subscription = auth()->user()->tenant
            ->subscriptions()
            ->findOrFail($id);

        $this->service->cancel($subscription);

        return response()->json(['message' => 'Assinatura cancelada com sucesso.']);
    }
}
```

**`SubscriptionStoreRequest` — validações:**

```php
public function rules(): array
{
    return [
        'plan_slug'    => ['required', 'string', 'exists:subscription_plans,slug'],
        'billing_type' => ['required', 'string', 'in:BOLETO,CREDIT_CARD,PIX'],
    ];
}
```

---

### 4.2. `AsaasWebhookController` (rota pública)

```php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TenantSubscription;
use Carbon\Carbon;
use Illuminate\Http\Request;

class AsaasWebhookController extends Controller
{
    public function handle(Request $request): \Illuminate\Http\JsonResponse
    {
        // Verificar autenticidade do webhook
        $token = $request->header('asaas-access-token');
        if ($token !== config('services.asaas.webhook_token')) {
            abort(401, 'Unauthorized webhook');
        }

        $event = $request->input('event');
        $payment = $request->input('payment');

        // Buscar assinatura local pela externalReference (tenant_id)
        $tenantId = $payment['externalReference'] ?? null;
        $subscription = TenantSubscription::where('tenant_id', $tenantId)
            ->whereIn('status', ['pending', 'active'])
            ->latest()
            ->first();

        if (!$subscription) {
            return response()->json(['ok' => true]); // idempotente
        }

        match ($event) {
            'PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED' => $subscription->update([
                'status'        => 'active',
                'next_due_date' => $payment['dueDate'] ?? null,
                'started_at'    => $subscription->started_at ?? Carbon::now(),
            ]),
            'PAYMENT_OVERDUE' => $subscription->update([
                'status' => 'inactive',
            ]),
            'SUBSCRIPTION_DELETED' => $subscription->update([
                'status'  => 'expired',
                'ends_at' => Carbon::now(),
            ]),
            default => null,
        };

        return response()->json(['ok' => true]);
    }
}
```

---

### 4.3. `PlanController`

```php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionPlan;

class PlanController extends Controller
{
    /** GET /api/plans */
    public function index()
    {
        $plans = SubscriptionPlan::where('is_active', true)->get();
        return \App\Http\Resources\SubscriptionPlanResource::collection($plans);
    }
}
```

---

### 4.4. API Resources

Garantem que o contrato do backend (que usa internamente `snake_case`) seja convertido para o formato esperado pelo frontend em `camelCase`, ocultando metadados e chaves estrangeiras (`tenant_id`, `plan_id`, etc).

```php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubscriptionPlanResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'name'          => $this->name,
            'slug'          => $this->slug,
            'asaasCycle'    => $this->asaas_cycle,
            'pricePerMonth' => (float) $this->price_per_month,
            'totalPrice'    => (float) $this->total_price,
            'description'   => $this->description,
            'isActive'      => (bool) $this->is_active,
        ];
    }
}
```

```php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TenantSubscriptionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'plan'                => new SubscriptionPlanResource($this->whenLoaded('plan')),
            'billingType'         => $this->billing_type,
            'status'              => $this->status,
            'asaasSubscriptionId' => $this->asaas_subscription_id,
            'nextDueDate'         => $this->next_due_date ? (string) $this->next_due_date : null,
            'startedAt'           => $this->started_at ? (string) $this->started_at : null,
            'endsAt'              => $this->ends_at ? (string) $this->ends_at : null,
        ];
    }
}
```

---

## 5. Rotas (`routes/api.php`)

```php
// Planos (público — usado na landing page e no billing)
Route::get('/plans', [PlanController::class, 'index']);

// Webhook Asaas (público — Asaas faz POST sem autenticação Sanctum)
Route::post('/webhooks/asaas', [AsaasWebhookController::class, 'handle']);

// Assinaturas (autenticado)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/subscriptions/current', [SubscriptionController::class, 'current']);
    Route::post('/subscriptions', [SubscriptionController::class, 'store']);
    Route::delete('/subscriptions/{id}', [SubscriptionController::class, 'destroy']);
});
```

---

## 6. Permissões (Spatie)

Adicionar ao seeder de permissões:

```php
'subscriptions.view',    // ver assinatura atual
'subscriptions.manage',  // criar/cancelar assinaturas (admin da imobiliária)
```

---

## 7. Observações de Produção

- Trocar `ASAAS_BASE_URL` para `https://api.asaas.com` em produção
- O webhook do Asaas deve ser configurado no painel Asaas apontando para `https://seu-dominio.com/api/webhooks/asaas`
- Configurar o webhook via `POST /v3/webhooks` no Asaas com os eventos: `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `SUBSCRIPTION_DELETED`
- Usar Queue para processar o webhook de forma assíncrona em produção (evitar timeout)
- Implementar idempotência no webhook: verificar se o evento já foi processado antes de atualizar
