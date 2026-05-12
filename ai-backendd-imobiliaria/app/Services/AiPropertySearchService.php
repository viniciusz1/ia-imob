<?php

namespace App\Services;

use App\Models\ScrapyProperty;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiPropertySearchService
{
    private const SYSTEM_PROMPT = <<<'PROMPT'
You are a property search assistant for a Brazilian real estate platform. Extract structured search filters from the user's natural language query in Portuguese.

Available filter fields — return ONLY the fields mentioned by the user. Use EXACT values from the lists below when a match is found:

- tipo: array of property types. Valid values: "Apartamento", "Casa", "Cobertura", "Terreno", "Comercial", "Kitnet", "Studio", "Loft", "Sobrado", "Galpão", "Barracão", "Sala", "Sala Comercial", "Loja", "Ponto Comercial"
- bairro: array of neighborhood names mentioned (can be partial)
- cidade: array of city names mentioned (can be partial)
- imobiliaria: array of real estate agency names (if mentioned)
- quartos: array of exact number of bedrooms (integers). If user says "3 quartos" → [3]. If user says "3 ou 4 quartos" → [3,4]
- quartos_plus: boolean true if user wants 4 or more bedrooms (e.g., "4 ou mais quartos", "4+ quartos")
- suites: array of exact number of suites (integers)
- suites_plus: boolean true if user wants 4 or more suites
- banheiros: array of exact number of bathrooms (integers)
- banheiros_plus: boolean true if user wants 4 or more bathrooms
- vagas: array of exact number of parking spaces (integers)
- vagas_plus: boolean true if user wants 4 or more parking spaces
- min: integer minimum price (extract number only, no symbols. e.g., "até 500 mil" → 500000, "R$ 300.000" → 300000. If user says just "500" assume thousands → 500000)
- max: integer maximum price (same format as min)
- comodidades: array of desired amenities. Valid values: "piscina", "churrasqueira", "academia", "salao_festas", "playground", "sacada", "mobiliado", "ar_condicionado", "lavanderia", "escritorio", "closet", "elevador", "portaria_24h", "aceita_permuta", "financiamento"

Important rules:
- If the user mentions something you cannot map, ignore it
- If the user asks for "3 quartos" it means exactly 3 bedrooms, not 3+
- Prices like "500 mil" = 500000, "1 milhão" = 1000000, "2 milhões" = 2000000
- Map synonyms: "ap" or "ape" → "Apartamento", "apto" → "Apartamento", "kit" → "Kitnet"
- Map "área de lazer" to "piscina", "salão de festas" to "salao_festas", "ar" or "ar condicionado" to "ar_condicionado", "varanda" to "sacada", "portaria" or "porteiro" to "portaria_24h", "mobiliado" or "móveis" to "mobiliado", "elevador" to "elevador", "garagem" to "vagas"

Return ONLY a valid JSON object. Do not include any explanation, markdown, or code blocks. The response must be parseable by json_decode().

Example:
User: "Quero um apartamento de 3 quartos no bairro Amizade"
Response: {"tipo":["Apartamento"],"bairro":["Amizade"],"quartos":[3]}

User: "casa com piscina e churrasqueira até 500 mil"
Response: {"tipo":["Casa"],"comodidades":["piscina","churrasqueira"],"max":500000}
PROMPT;

    public function parsePrompt(string $prompt): array
    {
        $apiKey = config('deepseek.api_key');
        $baseUrl = config('deepseek.base_url');
        $model = config('deepseek.model');
        $timeout = config('deepseek.timeout', 30);

        if (empty($apiKey)) {
            throw new \RuntimeException('DEEPSEEK_API_KEY not configured.');
        }

        try {
            $response = Http::timeout($timeout)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $apiKey,
                    'Content-Type' => 'application/json',
                ])
                ->post($baseUrl . '/v1/chat/completions', [
                    'model' => $model,
                    'messages' => [
                        ['role' => 'system', 'content' => self::SYSTEM_PROMPT],
                        ['role' => 'user', 'content' => $prompt],
                    ],
                    'temperature' => 0.1,
                    'max_tokens' => 1024,
                ]);

            if (!$response->successful()) {
                Log::error('DeepSeek API error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                throw new \RuntimeException('AI service returned error: ' . $response->status());
            }

            $data = $response->json();
            $content = $data['choices'][0]['message']['content'] ?? '';

            $content = trim($content);

            if (str_starts_with($content, '```')) {
                $content = trim(preg_replace('/^```(?:json)?\s*\n?/', '', $content));
                $content = trim(preg_replace('/\n?```\s*$/', '', $content));
            }

            $filters = json_decode($content, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error('Failed to parse DeepSeek response', [
                    'content' => $content,
                    'error' => json_last_error_msg(),
                ]);
                throw new \RuntimeException('Failed to parse AI response.');
            }

            if (!is_array($filters)) {
                throw new \RuntimeException('AI response is not a valid filter object.');
            }

            return $this->normalizeFilters($filters);
        } catch (ConnectionException $e) {
            Log::error('DeepSeek connection error', ['message' => $e->getMessage()]);
            throw new \RuntimeException('Could not connect to AI service.');
        }
    }

    public function search(array $filters, int $perPage = 20)
    {
        $query = ScrapyProperty::query();

        $query->applyFilters($filters);

        $query->orderBy('id', 'desc');

        return $query->paginate($perPage);
    }

    private function normalizeFilters(array $filters): array
    {
        $normalized = [];

        if (!empty($filters['tipo']) && is_array($filters['tipo'])) {
            $normalized['tipo'] = $filters['tipo'];
        }

        if (!empty($filters['bairro']) && is_array($filters['bairro'])) {
            $normalized['bairro_fuzzy'] = $filters['bairro'];
        }

        if (!empty($filters['cidade']) && is_array($filters['cidade'])) {
            $normalized['cidade_fuzzy'] = $filters['cidade'];
        }

        if (!empty($filters['imobiliaria']) && is_array($filters['imobiliaria'])) {
            $normalized['imobiliaria'] = $filters['imobiliaria'];
        }

        if (!empty($filters['quartos']) && is_array($filters['quartos'])) {
            $normalized['quartos'] = $filters['quartos'];
        }

        if (!empty($filters['quartos_plus'])) {
            $normalized['quartos_plus'] = true;
        }

        if (!empty($filters['suites']) && is_array($filters['suites'])) {
            $normalized['suites'] = $filters['suites'];
        }

        if (!empty($filters['suites_plus'])) {
            $normalized['suites_plus'] = true;
        }

        if (!empty($filters['banheiros']) && is_array($filters['banheiros'])) {
            $normalized['banheiros'] = $filters['banheiros'];
        }

        if (!empty($filters['banheiros_plus'])) {
            $normalized['banheiros_plus'] = true;
        }

        if (!empty($filters['vagas']) && is_array($filters['vagas'])) {
            $normalized['vagas'] = $filters['vagas'];
        }

        if (!empty($filters['vagas_plus'])) {
            $normalized['vagas_plus'] = true;
        }

        if (isset($filters['min']) && is_numeric($filters['min'])) {
            $normalized['min'] = (int) $filters['min'];
        }

        if (isset($filters['max']) && is_numeric($filters['max'])) {
            $normalized['max'] = (int) $filters['max'];
        }

        if (!empty($filters['comodidades']) && is_array($filters['comodidades'])) {
            $validComodidades = [
                'piscina', 'churrasqueira', 'academia', 'salao_festas',
                'playground', 'sacada', 'mobiliado', 'ar_condicionado',
                'lavanderia', 'escritorio', 'closet', 'elevador',
                'portaria_24h', 'aceita_permuta', 'financiamento',
            ];

            foreach ($filters['comodidades'] as $comodidade) {
                if (in_array($comodidade, $validComodidades, true)) {
                    $normalized[$comodidade] = true;
                }
            }
        }

        return $normalized;
    }
}
