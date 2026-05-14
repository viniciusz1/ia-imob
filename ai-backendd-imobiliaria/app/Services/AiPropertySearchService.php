<?php

namespace App\Services;

use App\Models\ScrapyProperty;
use App\Models\AiParseCache;
use App\Services\Ai\PromptFilterSchema;
use App\Services\Ai\Providers\LlmProvider;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AiPropertySearchService
{
    public const SCHEMA_VERSION = '1.0.0';

    private const VALID_SORTS = ['price_asc', 'price_desc', 'area_asc', 'area_desc', 'newest'];

    private const SECONDARY_AMENITIES = [
        'academia',
        'salao_festas',
        'playground',
        'sacada',
        'mobiliado',
        'lavanderia',
        'closet',
    ];

    public function __construct(
        private readonly LlmProvider $provider,
    ) {}
    private const SYSTEM_PROMPT = <<<'PROMPT'
You are a property search assistant for a Brazilian real estate platform. Extract structured search filters from the user's natural language query in Portuguese.

Available filter fields — return ONLY the fields mentioned by the user. Use EXACT values from the lists below when a match is found:

- tipo: array of property types. Valid values: "Apartamento", "Casa", "Cobertura", "Terreno", "Comercial", "Kitnet", "Studio", "Loft", "Sobrado", "Galpão", "Barracão", "Sala", "Sala Comercial", "Loja", "Ponto Comercial"
- bairro: array of neighborhood names mentioned (can be partial)
- cidade: array of city names mentioned (can be partial)
- locations: array of objects {"bairro": string, "cidade": string}. Use this for paired bairro+city filters and for proximity already resolved into neighborhoods.
- proximity: object {"reference": string, "city"?: string, "radius_hint"?: "muito_perto"|"perto"|"regiao", "resolved"?: boolean}. Keep this for explainability when the user asks for "perto", "próximo", "redondezas", "arredores" or "região".
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
- sort: optional string. Valid values: "price_asc", "price_desc", "area_asc", "area_desc", "newest"

Important rules:
- If the user mentions something you cannot map, ignore it
- If the user asks for "3 quartos" it means exactly 3 bedrooms, not 3+
- Prices like "500 mil" = 500000, "1 milhão" = 1000000, "2 milhões" = 2000000
- Map synonyms: "ap" or "ape" → "Apartamento", "apto" → "Apartamento", "kit" → "Kitnet"
- Map "área de lazer" to "piscina", "salão de festas" to "salao_festas", "ar" or "ar condicionado" to "ar_condicionado", "varanda" to "sacada", "portaria" or "porteiro" to "portaria_24h", "mobiliado" or "móveis" to "mobiliado", "elevador" to "elevador", "garagem" to "vagas"
- Map sorting: "mais baratos primeiro", "menor preço" → "price_asc"; "mais caros primeiro", "maior preço" → "price_desc"; "maior área" → "area_desc"; "menor área" → "area_asc"; "mais recentes" → "newest"
- When the user asks for proximity, use the proximity catalog below and generate final filters in locations. Do not invent neighborhoods outside the catalog. Keep proximity.resolved=true when you used the catalog.
- If the user asks for "perto do centro" and a context city is provided, use that context city.
- If proximity is requested but there is no matching catalog entry, return proximity with resolved=false and do not invent locations.
- Use locations for "Centro de Joinville ou Atiradores em Curitiba" so the city is paired with the right neighborhood.

Return ONLY a valid JSON object. Do not include any explanation, markdown, or code blocks. The response must be parseable by json_decode().

Example:
User: "Quero um apartamento de 3 quartos no bairro Amizade"
Response: {"tipo":["Apartamento"],"bairro":["Amizade"],"quartos":[3]}

User: "casa com piscina e churrasqueira até 500 mil"
Response: {"tipo":["Casa"],"comodidades":["piscina","churrasqueira"],"max":500000}

User: "ap 2 quartos no Centro de Joinville ou em Atiradores Curitiba"
Response: {"tipo":["Apartamento"],"quartos":[2],"locations":[{"bairro":"Centro","cidade":"Joinville"},{"bairro":"Atiradores","cidade":"Curitiba"}]}

User: "quero apartamento perto do centro"
Context city: "Jaraguá do Sul"
Response: {"tipo":["Apartamento"],"proximity":{"reference":"centro","city":"Jaraguá do Sul","radius_hint":"perto","resolved":true},"locations":[{"bairro":"Centro","cidade":"Jaraguá do Sul"},{"bairro":"Vila Lenzi","cidade":"Jaraguá do Sul"},{"bairro":"Nova Brasília","cidade":"Jaraguá do Sul"}]}

User: "casa perto da UDESC"
Response: {"tipo":["Casa"],"proximity":{"reference":"udesc","radius_hint":"perto","resolved":true},"locations":[{"bairro":"Bom Retiro","cidade":"Joinville"},{"bairro":"América","cidade":"Joinville"}]}
PROMPT;

    public function parsePrompt(string $prompt, ?string $contextCity = null): array
    {
        $contextCity = $contextCity ?: config('proximity.default_city');

        if (!config('ai.cache.enabled')) {
            return $this->parsePromptUncached($prompt, $contextCity);
        }

        $key = $this->cacheKey($prompt, $contextCity);
        $userId = auth()->id();

        $cached = AiParseCache::where('cache_key', $key)
            ->latest()
            ->first();

        if ($cached) {
            AiParseCache::create([
                'cache_key' => $key,
                'prompt' => $prompt,
                'context_city' => $contextCity,
                'filters' => $cached->filters,
                'schema_version' => self::SCHEMA_VERSION,
                'user_id' => $userId,
                'cache_hit' => true,
            ]);

            return $cached->filters;
        }

        $filters = $this->parsePromptUncached($prompt, $contextCity);

        AiParseCache::create([
            'cache_key' => $key,
            'prompt' => $prompt,
            'context_city' => $contextCity,
            'filters' => $filters,
            'schema_version' => self::SCHEMA_VERSION,
            'user_id' => $userId,
            'cache_hit' => false,
        ]);

        return $filters;
    }

    private function parsePromptUncached(string $prompt, ?string $contextCity = null): array
    {
        $responseFormat = config('ai.structured_output')
            ? ['type' => 'json_object']
            : [];

        $content = $this->provider->chat(
            messages: [
                ['role' => 'system', 'content' => $this->buildSystemPrompt($contextCity)],
                ['role' => 'user', 'content' => $this->buildUserPrompt($prompt, $contextCity)],
            ],
            responseFormat: $responseFormat,
        );

        $content = trim($content);

        if (str_starts_with($content, '```')) {
            $content = trim(preg_replace('/^```(?:json)?\s*\n?/', '', $content));
            $content = trim(preg_replace('/\n?```\s*$/', '', $content));
        }

        try {
            $filters = json_decode($content, true, flags: JSON_THROW_ON_ERROR);
        } catch (\JsonException $e) {
            Log::error('Failed to parse AI response', [
                'content' => $content,
                'error' => $e->getMessage(),
            ]);
            throw new \RuntimeException('Failed to parse AI response.');
        }

        if (!is_array($filters)) {
            throw new \RuntimeException('AI response is not a valid filter object.');
        }

        return $this->normalizeFilters($filters, $contextCity);
    }

    private function cacheKey(string $prompt, ?string $contextCity): string
    {
        return 'ai:parse:' . hash('sha256', json_encode([
            'prompt' => Str::of($prompt)->lower()->squish()->ascii()->toString(),
            'city' => $contextCity,
            'schema' => self::SCHEMA_VERSION,
        ]));
    }

    public function search(array $filters, int $perPage = 21, ?string $sort = null, int $page = 1): array
    {
        $sort = $this->normalizeSort($sort ?: ($filters['sort'] ?? 'newest'));
        $attempts = $this->buildSearchAttempts($filters);

        foreach ($attempts as $attempt) {
            $properties = $this->paginateFilters($attempt['filters'], $perPage, $sort, $page);

            if ($properties->total() > 0) {
                return [
                    'filters' => $attempt['filters'],
                    'properties' => $properties,
                    'meta' => [
                        'approximate' => $attempt['approximate'],
                        'relaxed' => $attempt['relaxed'],
                        'sort' => $sort,
                    ],
                ];
            }
        }

        $lastAttempt = end($attempts) ?: [
            'filters' => $filters,
            'approximate' => false,
            'relaxed' => [],
        ];
        $properties = $this->paginateFilters($lastAttempt['filters'], $perPage, $sort, $page);

        return [
            'filters' => $lastAttempt['filters'],
            'properties' => $properties,
            'meta' => [
                'approximate' => $lastAttempt['approximate'],
                'relaxed' => $lastAttempt['relaxed'],
                'sort' => $sort,
            ],
        ];
    }

    private function normalizeFilters(array $filters, ?string $contextCity = null): array
    {
        $normalized = [];
        $contextCity = $contextCity ?: config('proximity.default_city');
        $cities = $this->normalizeStringArray($filters['cidade'] ?? []);
        $primaryCity = $cities[0] ?? $contextCity;

        $locations = $this->normalizeLocations($filters['locations'] ?? [], $primaryCity);
        $proximity = $this->normalizeProximity($filters['proximity'] ?? null, $primaryCity);

        if (!empty($proximity) && empty($locations)) {
            $resolvedLocations = $this->resolveProximityLocations($proximity, $contextCity);
            if (!empty($resolvedLocations)) {
                $locations = $resolvedLocations;
                $proximity['resolved'] = true;
                $proximity['city'] = $proximity['city'] ?? ($resolvedLocations[0]['cidade'] ?? null);
            } else {
                $proximity['resolved'] = false;
                Log::info('Unresolved AI proximity filter', ['proximity' => $proximity]);
            }
        }

        if (!empty($filters['tipo']) && is_array($filters['tipo'])) {
            $normalized['tipo'] = $filters['tipo'];
        }

        if (!empty($locations)) {
            $normalized['locations'] = $locations;
        }

        if (!empty($proximity)) {
            $normalized['proximity'] = $proximity;
        }

        if (empty($locations) && !empty($filters['bairro']) && is_array($filters['bairro'])) {
            $normalized['bairro_fuzzy'] = array_map(
                fn ($bairro) => $this->normalizeNeighborhoodName((string) $bairro, $primaryCity),
                $this->normalizeStringArray($filters['bairro'])
            );
        }

        if (empty($locations) && !empty($cities)) {
            $normalized['cidade_fuzzy'] = $cities;
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

        if (!empty($filters['sort']) && is_string($filters['sort'])) {
            $normalized['sort'] = $this->normalizeSort($filters['sort']);
        }

        return $normalized;
    }

    private function buildSystemPrompt(?string $contextCity): string
    {
        return self::SYSTEM_PROMPT
            . "\n\nContext city: " . ($contextCity ?: 'none')
            . "\n\n" . $this->renderProximityCatalog();
    }

    private function buildUserPrompt(string $prompt, ?string $contextCity): string
    {
        return "Context city: " . ($contextCity ?: 'none') . "\nUser: " . $prompt;
    }

    private function renderProximityCatalog(): string
    {
        $lines = ['PROXIMITY CATALOG AVAILABLE TO GENERATE locations:'];

        foreach ((array) config('proximity.cities', []) as $city) {
            $lines[] = ($city['name'] ?? 'Cidade') . ' neighborhoods: ' . implode(', ', (array) ($city['neighborhoods'] ?? []));

            foreach ((array) ($city['aliases'] ?? []) as $correctName => $aliases) {
                $lines[] = '- Normalize "' . implode('" or "', (array) $aliases) . '" to "' . $correctName . '"';
            }
        }

        foreach ((array) config('proximity.references', []) as $cityReferences) {
            foreach ($cityReferences as $reference => $data) {
                $lines[] = sprintf(
                    '- %s / %s: %s',
                    $data['city'] ?? 'Cidade',
                    str_replace('_', ' ', $reference),
                    implode(', ', (array) ($data['bairros'] ?? []))
                );
            }
        }

        return implode("\n", $lines);
    }

    private function normalizeLocations(mixed $locations, ?string $fallbackCity): array
    {
        if (!is_array($locations)) {
            return [];
        }

        $normalized = [];

        foreach ($locations as $location) {
            if (!is_array($location)) {
                continue;
            }

            $bairro = trim((string) ($location['bairro'] ?? ''));
            $cidade = trim((string) ($location['cidade'] ?? $fallbackCity ?? ''));

            if ($bairro === '' && $cidade === '') {
                continue;
            }

            if ($bairro !== '') {
                $bairro = $this->normalizeNeighborhoodName($bairro, $cidade ?: $fallbackCity);
            }

            $key = Str::lower($bairro . '|' . $cidade);
            $normalized[$key] = array_filter([
                'bairro' => $bairro,
                'cidade' => $cidade,
            ]);
        }

        return array_values($normalized);
    }

    private function normalizeProximity(mixed $proximity, ?string $fallbackCity): array
    {
        if (!is_array($proximity)) {
            return [];
        }

        $reference = trim((string) ($proximity['reference'] ?? ''));

        if ($reference === '') {
            return [];
        }

        $radiusHint = $proximity['radius_hint'] ?? 'perto';
        if (!in_array($radiusHint, ['muito_perto', 'perto', 'regiao'], true)) {
            $radiusHint = 'perto';
        }

        return array_filter([
            'reference' => $reference,
            'city' => trim((string) ($proximity['city'] ?? $fallbackCity ?? '')),
            'radius_hint' => $radiusHint,
            'resolved' => isset($proximity['resolved']) ? (bool) $proximity['resolved'] : null,
        ], fn ($value) => $value !== null && $value !== '');
    }

    private function resolveProximityLocations(array $proximity, ?string $contextCity): array
    {
        $cityKey = $this->slug($proximity['city'] ?? $contextCity ?? config('proximity.default_city'));
        $referenceKey = $this->slug($proximity['reference'] ?? '');
        $cityReferences = (array) config("proximity.references.$cityKey", []);
        $reference = $cityReferences[$referenceKey] ?? null;

        if (!$reference) {
            foreach ($cityReferences as $candidate) {
                $aliases = array_map(fn ($alias) => $this->slug((string) $alias), (array) ($candidate['aliases'] ?? []));
                if (in_array($referenceKey, $aliases, true)) {
                    $reference = $candidate;
                    break;
                }
            }
        }

        if (!$reference) {
            return [];
        }

        $city = $reference['city'] ?? ($proximity['city'] ?? $contextCity);

        return array_map(
            fn ($bairro) => ['bairro' => $bairro, 'cidade' => $city],
            (array) ($reference['bairros'] ?? [])
        );
    }

    private function normalizeNeighborhoodName(string $bairro, ?string $city): string
    {
        $cityKey = $this->slug($city ?: config('proximity.default_city'));
        $aliases = (array) config("proximity.cities.$cityKey.aliases", []);
        $bairroKey = $this->slug($bairro);

        foreach ($aliases as $correctName => $aliasList) {
            if ($bairroKey === $this->slug((string) $correctName)) {
                return (string) $correctName;
            }

            foreach ((array) $aliasList as $alias) {
                if ($bairroKey === $this->slug((string) $alias)) {
                    return (string) $correctName;
                }
            }
        }

        return trim($bairro);
    }

    private function normalizeStringArray(mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }

        return array_values(array_unique(array_filter(array_map(
            fn ($item) => trim((string) $item),
            $value
        ))));
    }

    private function normalizeSort(?string $sort): string
    {
        return in_array($sort, self::VALID_SORTS, true) ? $sort : 'newest';
    }

    private function paginateFilters(array $filters, int $perPage, string $sort, int $page)
    {
        $query = ScrapyProperty::query();
        $query->applyFilters($filters);
        $this->applySort($query, $sort);

        return $query->paginate($perPage, ['*'], 'page', max(1, $page));
    }

    private function applySort($query, string $sort): void
    {
        match ($sort) {
            'price_asc' => $query->orderBy('valor', 'asc')->orderBy('id', 'desc'),
            'price_desc' => $query->orderBy('valor', 'desc')->orderBy('id', 'desc'),
            'area_asc' => $query->orderBy('area', 'asc')->orderBy('id', 'desc'),
            'area_desc' => $query->orderBy('area', 'desc')->orderBy('id', 'desc'),
            default => $query->orderBy('id', 'desc'),
        };
    }

    private function buildSearchAttempts(array $filters): array
    {
        $attempts = [[
            'filters' => $filters,
            'approximate' => false,
            'relaxed' => [],
        ]];

        $current = $filters;
        $relaxed = [];

        foreach (self::SECONDARY_AMENITIES as $amenity) {
            if (array_key_exists($amenity, $current)) {
                unset($current[$amenity]);
                $relaxed[] = "comodidades.$amenity";
            }
        }
        $this->appendAttemptIfChanged($attempts, $filters, $current, $relaxed);

        foreach (['min', 'max'] as $priceFilter) {
            if (array_key_exists($priceFilter, $current)) {
                unset($current[$priceFilter]);
                $relaxed[] = $priceFilter;
            }
        }
        $this->appendAttemptIfChanged($attempts, $filters, $current, $relaxed);

        foreach (['quartos_plus', 'suites_plus', 'banheiros_plus', 'vagas_plus'] as $plusFilter) {
            if (array_key_exists($plusFilter, $current)) {
                unset($current[$plusFilter]);
                $relaxed[] = $plusFilter;
            }
        }
        $this->appendAttemptIfChanged($attempts, $filters, $current, $relaxed);

        $current = $this->relaxNeighborhoodFilters($current, $relaxed);
        $this->appendAttemptIfChanged($attempts, $filters, $current, $relaxed);

        return $attempts;
    }

    private function appendAttemptIfChanged(array &$attempts, array $original, array $filters, array $relaxed): void
    {
        if ($filters === $original || empty($relaxed)) {
            return;
        }

        $last = end($attempts);
        if (($last['filters'] ?? null) === $filters) {
            return;
        }

        $attempts[] = [
            'filters' => $filters,
            'approximate' => true,
            'relaxed' => array_values(array_unique($relaxed)),
        ];
    }

    private function relaxNeighborhoodFilters(array $filters, array &$relaxed): array
    {
        $cities = $this->normalizeStringArray($filters['cidade'] ?? []);
        $cities = array_merge($cities, $this->normalizeStringArray($filters['cidade_fuzzy'] ?? []));

        foreach ((array) ($filters['locations'] ?? []) as $location) {
            if (is_array($location) && !empty($location['cidade'])) {
                $cities[] = (string) $location['cidade'];
            }
        }

        foreach (['bairro', 'bairro_fuzzy', 'locations', 'proximity'] as $neighborhoodFilter) {
            if (array_key_exists($neighborhoodFilter, $filters)) {
                unset($filters[$neighborhoodFilter]);
                $relaxed[] = $neighborhoodFilter;
            }
        }

        $cities = array_values(array_unique(array_filter($cities)));
        if (!empty($cities) && empty($filters['cidade']) && empty($filters['cidade_fuzzy'])) {
            $filters['cidade_fuzzy'] = $cities;
        }

        return $filters;
    }

    private function slug(string $value): string
    {
        return Str::of($value)
            ->ascii()
            ->lower()
            ->replaceMatches('/[^a-z0-9]+/', '_')
            ->trim('_')
            ->toString();
    }
}
