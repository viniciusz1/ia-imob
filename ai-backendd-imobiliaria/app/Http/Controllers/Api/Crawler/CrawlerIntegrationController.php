<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class CrawlerIntegrationController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => collect(config('crawler.integrations'))->map(
            fn (array $integration, string $key): array => $this->representation($key, $integration),
        )->values()]);
    }

    public function test(string $integration): JsonResponse
    {
        $configuration = config("crawler.integrations.{$integration}");
        abort_if(! is_array($configuration), 404);
        $representation = $this->representation($integration, $configuration);

        return response()->json(['data' => [
            ...$representation,
            'status' => $representation['availability'] === 'configured' ? 'configuration_valid' : 'unavailable',
            'message' => $representation['availability'] === 'configured'
                ? 'Credencial configurada; o segredo permaneceu oculto.'
                : 'Credencial não configurada.',
        ]]);
    }

    private function representation(string $key, array $integration): array
    {
        $credential = (string) ($integration['credential'] ?? '');

        return [
            'key' => $key,
            'label' => $integration['label'],
            'availability' => $credential === '' ? 'unavailable' : 'configured',
            'credential_identifier' => $credential === '' ? null : '…'.substr($credential, -4),
        ];
    }
}
