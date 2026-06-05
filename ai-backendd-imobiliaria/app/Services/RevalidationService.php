<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RevalidationService
{
    public function revalidate(array $tags): void
    {
        $url = config('services.next.revalidate_url');
        $secret = config('services.next.revalidation_secret');

        if (empty($url) || empty($secret)) {
            return;
        }

        $payload = json_encode(['tags' => $tags]);
        $signature = hash_hmac('sha256', $payload, $secret);

        try {
            $response = Http::timeout(10)
                ->withHeader('X-Revalidation-Signature', $signature)
                ->withHeader('Content-Type', 'application/json')
                ->post($url, ['tags' => $tags]);

            if ($response->failed()) {
                Log::warning('Revalidation webhook failed', [
                    'url' => $url,
                    'status' => $response->status(),
                    'tags' => $tags,
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('Revalidation webhook error', [
                'url' => $url,
                'tags' => $tags,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
