# Plano Técnico 01: Structured Output / Function Calling

## 1. Motivação

Hoje, `AiPropertySearchService::parsePrompt` pede ao LLM um JSON em texto livre. O código precisa:

- Remover delimitadores markdown (` ```json `) via `preg_replace` (`AiPropertySearchService.php:122-124`).
- Validar manualmente que veio um objeto.
- Confiar que o modelo não inventou campos fora do contrato.

Isso é frágil. Modelos mais novos suportam **structured outputs** (JSON Schema enforced) ou **tool use** — o provider garante que a resposta segue o schema, sem markdown, sem campo extra.

## 2. Mudanças

### 2.1 Definir o JSON Schema dos filtros

Criar `app/Services/Ai/PromptFilterSchema.php`:

```php
final class PromptFilterSchema
{
    public static function definition(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'tipo' => ['type' => 'array', 'items' => ['type' => 'string',
                    'enum' => ['Apartamento','Casa','Cobertura','Terreno','Comercial',
                               'Kitnet','Studio','Loft','Sobrado','Galpão','Barracão',
                               'Sala','Sala Comercial','Loja','Ponto Comercial']]],
                'locations' => ['type' => 'array', 'items' => [
                    'type' => 'object',
                    'properties' => [
                        'bairro' => ['type' => 'string'],
                        'cidade' => ['type' => 'string'],
                    ],
                    'required' => ['cidade'],
                    'additionalProperties' => false,
                ]],
                'proximity' => [
                    'type' => 'object',
                    'properties' => [
                        'reference' => ['type' => 'string'],
                        'city' => ['type' => 'string'],
                        'radius_hint' => ['type' => 'string',
                            'enum' => ['muito_perto','perto','regiao']],
                    ],
                    'additionalProperties' => false,
                ],
                'quartos' => ['type' => 'array', 'items' => ['type' => 'integer']],
                'quartos_plus' => ['type' => 'boolean'],
                // ... suites, banheiros, vagas, min, max, comodidades, sort
            ],
            'additionalProperties' => false,
        ];
    }
}
```

### 2.2 Trocar a chamada HTTP

Em `AiPropertySearchService::parsePrompt`:

```php
->post($baseUrl . '/v1/chat/completions', [
    'model' => $model,
    'messages' => [...],
    'temperature' => 0.1,
    'response_format' => [
        'type' => 'json_schema',
        'json_schema' => [
            'name' => 'property_filters',
            'strict' => true,
            'schema' => PromptFilterSchema::definition(),
        ],
    ],
]);
```

> DeepSeek suporta `response_format: { type: "json_object" }` (modo "JSON guaranteed"). Para `json_schema` estrito, considerar `gpt-4o-mini` ou `claude-haiku` se a qualidade não bater. A escolha do provider vira config (`config/ai.php`).

### 2.3 Remover o parser regex

`AiPropertySearchService.php:120-135` simplifica para:

```php
$content = $response->json('choices.0.message.content');
$filters = json_decode($content, true, flags: JSON_THROW_ON_ERROR);
```

### 2.4 Abstrair o provider

Criar `app/Services/Ai/Providers/LlmProvider.php` (interface) + `DeepSeekProvider`, `OpenAiProvider`, `AnthropicProvider`. Injetar via `app()->bind()` em `AppServiceProvider`. `AiPropertySearchService` recebe a interface, não chama `Http` direto.

Isso permite trocar de modelo sem mexer no service (importante para o item 06 quando comparar custo/qualidade).

## 3. Plano de Testes

- **Unit:** mockar `LlmProvider` e validar que `parsePrompt` rejeita respostas que não obedecem ao schema (campo extra, tipo errado).
- **Integration:** rodar com prompt real contra DeepSeek/OpenAI sandbox, comparar saída antes/depois em 20 prompts canônicos (montar fixture `tests/Fixtures/ai_prompts.json`).
- **Regressão:** rodar a suíte de busca existente e garantir 0 diffs em filtros normalizados.

## 4. Rollout

1. Implementar atrás de feature flag `AI_STRUCTURED_OUTPUT` (config).
2. Rodar shadow mode por 48h: executa ambos os caminhos, loga diffs.
3. Se diff < 2%, ativar e remover o caminho antigo.

## 5. Esforço

**1 dia** (incluindo testes). Sem migration, sem mudança de UI.

## 6. Sem Mudanças

- Frontend (`AiSearcherClient.tsx`) — contrato JSON na resposta da API é idêntico.
- `normalizeFilters` — segue válido como camada de defesa.
