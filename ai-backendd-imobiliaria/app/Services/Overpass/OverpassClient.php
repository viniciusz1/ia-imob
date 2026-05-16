<?php

namespace App\Services\Overpass;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OverpassClient
{
    public function fetch(string $query): array
    {
        try {
            $response = Http::timeout((int) config('overpass.timeout', 60))
                ->withUserAgent((string) config('overpass.user_agent'))
                ->asForm()
                ->post((string) config('overpass.endpoint'), [
                    'data' => $query,
                ]);
        } catch (ConnectionException $e) {
            Log::error('Overpass connection error', ['message' => $e->getMessage()]);

            throw new \RuntimeException('Could not connect to Overpass API.');
        }

        if (!$response->successful()) {
            Log::error('Overpass API error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            throw new \RuntimeException('Overpass API returned error: ' . $response->status());
        }

        $data = $response->json();

        if (!is_array($data)) {
            throw new \RuntimeException('Overpass API returned an invalid JSON payload.');
        }

        return $data;
    }
}
