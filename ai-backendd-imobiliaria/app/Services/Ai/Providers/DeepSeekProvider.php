<?php

namespace App\Services\Ai\Providers;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DeepSeekProvider implements LlmProvider
{
    public function chat(array $messages, array $responseFormat = [], array $options = []): string
    {
        $config = config('ai.providers.deepseek');

        if (empty($config['api_key'])) {
            throw new \RuntimeException('DEEPSEEK_API_KEY not configured.');
        }

        $payload = array_merge([
            'model' => $config['model'],
            'messages' => $messages,
            'temperature' => 0.1,
            'max_tokens' => 1024,
        ], $options);

        if (! empty($responseFormat)) {
            $payload['response_format'] = $responseFormat;
        }

        try {
            $response = Http::timeout($config['timeout'])
                ->withHeaders([
                    'Authorization' => 'Bearer '.$config['api_key'],
                    'Content-Type' => 'application/json',
                ])
                ->post($config['base_url'].'/v1/chat/completions', $payload);

            if (! $response->successful()) {
                Log::error('DeepSeek API error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                throw new \RuntimeException('AI service returned error: '.$response->status());
            }

            $data = $response->json();

            return $data['choices'][0]['message']['content'] ?? '';
        } catch (ConnectionException $e) {
            Log::error('DeepSeek connection error', ['message' => $e->getMessage()]);
            throw new \RuntimeException('Could not connect to AI service.');
        }
    }
}
