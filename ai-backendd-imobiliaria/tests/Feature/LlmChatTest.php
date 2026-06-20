<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class LlmChatTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('ai.providers.deepseek.api_key', 'fake-key');
        config()->set('ai.providers.deepseek.base_url', 'https://api.deepseek.com');
        config()->set('ai.providers.deepseek.model', 'deepseek-chat');
    }

    public function test_it_returns_llm_response_for_valid_messages(): void
    {
        Http::fake([
            'https://api.deepseek.com/v1/chat/completions' => Http::response([
                'choices' => [
                    [
                        'message' => [
                            'content' => 'Olá! Como posso ajudar?',
                        ],
                    ],
                ],
            ]),
        ]);

        $response = $this->postJson('/api/v1/llm/chat', [
            'messages' => [
                ['role' => 'system', 'content' => 'Você é um assistente.'],
                ['role' => 'user', 'content' => 'Oi'],
            ],
        ]);

        $response->assertOk()
            ->assertJson([
                'content' => 'Olá! Como posso ajudar?',
            ]);

        Http::assertSent(function ($request) {
            return $request->url() === 'https://api.deepseek.com/v1/chat/completions'
                && $request['model'] === 'deepseek-chat'
                && $request['messages'][0]['role'] === 'system'
                && $request['messages'][1]['role'] === 'user';
        });
    }

    public function test_it_returns_validation_error_when_messages_are_missing(): void
    {
        Http::fake();

        $response = $this->postJson('/api/v1/llm/chat', [
            'model' => 'deepseek-chat',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['messages']);

        Http::assertNothingSent();
    }

    public function test_it_returns_error_when_deepseek_api_fails(): void
    {
        Http::fake([
            'https://api.deepseek.com/v1/chat/completions' => Http::response(
                ['error' => ['message' => 'Internal error']],
                500,
            ),
        ]);

        $response = $this->postJson('/api/v1/llm/chat', [
            'messages' => [
                ['role' => 'user', 'content' => 'Oi'],
            ],
        ]);

        $response->assertStatus(502)
            ->assertJsonPath('message', 'Não foi possível obter resposta do assistente.');
    }
}
