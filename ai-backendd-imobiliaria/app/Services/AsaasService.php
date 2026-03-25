<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

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
            ->acceptJson();
    }

    // ─── Customer ─────────────────────────────────────────────────────────────

    /** POST /v3/customers */
    public function createCustomer(array $data): array
    {
        return $this->client()->post('/v3/customers', $data)->throw()->json();
    }

    /** GET /v3/customers/{id} */
    public function getCustomer(string $customerId): array
    {
        return $this->client()->get("/v3/customers/{$customerId}")->throw()->json();
    }

    // ─── Subscription ─────────────────────────────────────────────────────────

    /** POST /v3/subscriptions */
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
