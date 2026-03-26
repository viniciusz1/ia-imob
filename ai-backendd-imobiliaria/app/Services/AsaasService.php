<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AsaasService
{
    private string $baseUrl;
    private string $token;

    public function __construct()
    {
        $this->baseUrl = (string) config('services.asaas.base_url');
        $this->token   = (string) config('services.asaas.token');
    }

    private function client(): PendingRequest
    {
        return Http::baseUrl($this->baseUrl)
            ->withHeader('access_token', $this->token)
            ->beforeSending(function ($request, $options) {
                Log::debug('Asaas API Request', [
                    'url'    => $request->url(),
                    'method' => $request->method(),
                    'body'   => $request->body(),
                ]);
            })
            ->acceptJson();
    }

    // ─── Customer ─────────────────────────────────────────────────────────────

    /** POST /v3/customers */
    public function createCustomer(array $data): array
    {
        $response = $this->client()->post('/v3/customers', $data);
        Log::debug('Asaas API Response (Create Customer)', ['body' => $response->json()]);
        return $response->throw()->json();
    }

    /** PUT /v3/customers/{id} */
    public function updateCustomer(string $customerId, array $data): array
    {
        $response = $this->client()->put("/v3/customers/{$customerId}", $data);
        Log::debug('Asaas API Response (Update Customer)', ['body' => $response->json()]);
        return $response->throw()->json();
    }

    /** GET /v3/customers/{id} */
    public function getCustomer(string $customerId): array
    {
        $response = $this->client()->get("/v3/customers/{$customerId}");
        Log::debug('Asaas API Response (Get Customer)', ['body' => $response->json()]);
        return $response->throw()->json();
    }

    // ─── Subscription ─────────────────────────────────────────────────────────

    /** POST /v3/subscriptions */
    public function createSubscription(array $data): array
    {
        $response = $this->client()->post('/v3/subscriptions', $data);
        Log::debug('Asaas API Response (Create Subscription)', ['body' => $response->json()]);
        return $response->throw()->json();
    }

    /** POST /v3/subscriptions/{id} (Asaas uses POST to update subscriptions) */
    public function updateSubscription(string $subscriptionId, array $data): array
    {
        return $this->client()->post("/v3/subscriptions/{$subscriptionId}", $data)->throw()->json();
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
