<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\LlmChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LlmChatController extends Controller
{
    public function chat(Request $request, LlmChatService $service): JsonResponse
    {
        $data = $request->validate([
            'messages' => ['required', 'array', 'min:1'],
            'messages.*.role' => ['required', 'string', 'in:system,user,assistant'],
            'messages.*.content' => ['required', 'string'],
            'model' => ['sometimes', 'nullable', 'string'],
            'temperature' => ['sometimes', 'nullable', 'numeric', 'between:0,2'],
            'max_tokens' => ['sometimes', 'nullable', 'integer', 'min:1'],
        ]);

        try {
            $content = $service->chat(
                messages: $data['messages'],
                model: $data['model'] ?? null,
                temperature: $data['temperature'] ?? null,
                maxTokens: $data['max_tokens'] ?? null,
            );

            return response()->json([
                'content' => $content,
            ]);
        } catch (\RuntimeException $e) {
            return response()->json([
                'message' => 'Não foi possível obter resposta do assistente.',
                'error' => $e->getMessage(),
            ], 502);
        }
    }
}
