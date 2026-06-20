<?php

namespace App\Services;

use App\Services\Ai\Providers\LlmProvider;

class LlmChatService
{
    public function __construct(
        private readonly LlmProvider $provider,
    ) {}

    public function chat(
        array $messages,
        ?string $model = null,
        ?float $temperature = null,
        ?int $maxTokens = null,
    ): string {
        $options = [];

        if ($model !== null) {
            $options['model'] = $model;
        }

        if ($temperature !== null) {
            $options['temperature'] = $temperature;
        }

        if ($maxTokens !== null) {
            $options['max_tokens'] = $maxTokens;
        }

        return $this->provider->chat(
            messages: $messages,
            options: $options,
        );
    }
}
