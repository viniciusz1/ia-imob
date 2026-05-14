<?php

namespace App\Services\Ai\Providers;

interface LlmProvider
{
    public function chat(array $messages, array $responseFormat = []): string;
}
