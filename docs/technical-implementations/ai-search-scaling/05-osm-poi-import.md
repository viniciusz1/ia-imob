# Plano Técnico 05: Import de POIs via OpenStreetMap

## 1. Motivação

`config/proximity.php` mapeia manualmente referências (WEG, Shopping Mueller, IFSC, Hospital São José, etc.) para listas de bairros vizinhos. Adicionar uma cidade nova requer um humano:

1. Listar todos os bairros.
2. Listar referências relevantes (faculdades, hospitais, shoppings, indústrias…).
3. Decidir quais bairros "estão perto" de cada uma.
4. Manter aliases ("weg", "fábrica weg", "motor elétrico"...).

Para escalar a múltiplas cidades, isso vira o maior bloqueio de tempo de dev. Solução: **importar POIs do OpenStreetMap** com suas coordenadas reais, e usar `ST_DWithin` (do plano 04) para resolver "perto de X" dinamicamente.

## 2. Pré-requisito

Plano 04 (PostGIS + `geom` em `scrapy-properties`) implementado.

## 3. Schema

`database/migrations/2026_05_xx_create_points_of_interest_table.php`:

```php
Schema::create('points_of_interest', function (Blueprint $table) {
    $table->id();
    $table->string('osm_type', 16);   // 'node' | 'way' | 'relation'
    $table->bigInteger('osm_id');
    $table->string('name');
    $table->string('category', 64);   // 'shopping' | 'hospital' | 'university' | 'industry' | 'school' | ...
    $table->string('subcategory', 64)->nullable(); // tag OSM original
    $table->string('city');
    $table->string('state', 2);
    $table->decimal('lat', 10, 7);
    $table->decimal('lng', 10, 7);
    $table->jsonb('aliases')->nullable(); // ['weg', 'fábrica weg', 'motor elétrico']
    $table->jsonb('raw_tags')->nullable(); // tags OSM completas, debug
    $table->timestamp('imported_at');
    $table->timestamps();

    $table->unique(['osm_type', 'osm_id']);
    $table->index(['city', 'category']);
});

DB::statement('ALTER TABLE points_of_interest
    ADD COLUMN geom geography(Point, 4326) GENERATED ALWAYS AS
    (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) STORED;');

DB::statement('CREATE INDEX idx_pois_geom ON points_of_interest USING GIST (geom);');
DB::statement('CREATE INDEX idx_pois_name_trgm
    ON points_of_interest USING GIN (f_unaccent(name) gin_trgm_ops);');
```

## 4. Importador

### 4.1 Comando Artisan

```bash
php artisan pois:import --city="Jaraguá do Sul" --state=SC
php artisan pois:import --city="Joinville" --state=SC
```

### 4.2 Query Overpass

Criar `app/Services/Osm/OverpassImporter.php`. Para cada cidade, executar uma query Overpass agrupando categorias de interesse:

```overpass
[out:json][timeout:60];
area["name"="Jaraguá do Sul"]["admin_level"="8"]->.searchArea;
(
  node["shop"="mall"](area.searchArea);
  way["shop"="mall"](area.searchArea);
  node["amenity"~"hospital|clinic|university|school|college"](area.searchArea);
  way["amenity"~"hospital|clinic|university|school|college"](area.searchArea);
  node["industrial"](area.searchArea);
  way["industrial"](area.searchArea);
  node["office"="company"](area.searchArea);
);
out center;
```

### 4.3 Mapeamento OSM → categoria interna

```php
private const CATEGORY_MAP = [
    'shop=mall'             => 'shopping',
    'amenity=hospital'      => 'hospital',
    'amenity=clinic'        => 'hospital',
    'amenity=university'    => 'university',
    'amenity=college'       => 'university',
    'amenity=school'        => 'school',
    'industrial=*'          => 'industry',
    'office=company'        => 'industry',
];
```

### 4.4 Geração de aliases

Para cada POI importado, gerar aliases automaticamente:

```php
$aliases = [
    Str::slug($name, ' '),                   // 'shopping mueller'
    'perto de ' . Str::slug($name, ' '),     // 'perto de shopping mueller'
    'próximo a ' . Str::slug($name, ' '),    // ...
    // sigla se houver acrônimo evidente:
    self::extractAcronym($name),             // 'WEG' já é sigla, 'IFSC' idem
];
```

Aliases extras curados (ex: "motor elétrico" → WEG) podem ser adicionados manualmente no admin, mas **não são obrigatórios**.

## 5. Uso nas Buscas

### 5.1 Resolver "perto de X" via POI

`AiPropertySearchService::resolveProximityLocations` muda de "olhar `config/proximity.php`" para "buscar POI por nome/alias e converter para filtro `near`":

```php
private function resolveProximityNear(array $proximity, ?string $contextCity): ?array
{
    $reference = $proximity['reference'];
    $city = $proximity['city'] ?? $contextCity;
    $radiusMeters = match ($proximity['radius_hint'] ?? 'perto') {
        'muito_perto' => 1000,
        'perto'       => 2000,
        'regiao'      => 4000,
    };

    $poi = PointOfInterest::query()
        ->where('city', $city)
        ->where(function ($q) use ($reference) {
            $q->whereRaw('f_unaccent(name) ILIKE f_unaccent(?)', ['%' . $reference . '%'])
              ->orWhereRaw('aliases @> ?::jsonb', [json_encode([Str::lower($reference)])]);
        })
        ->first();

    return $poi ? ['lat' => $poi->lat, 'lng' => $poi->lng, 'meters' => $radiusMeters] : null;
}
```

### 5.2 Aplicar filtro `near`

O `filters['near']` (definido no plano 04) é populado pelo resultado acima.

### 5.3 Deprecar `config/proximity.php`

Ao fim deste plano, o arquivo pode ser deletado. O system prompt do LLM também enxuga (não precisa mais do catálogo embutido) — passa a apenas instruir "retorne `proximity.reference` quando o usuário falar 'perto/próximo/região de X'; o backend resolve".

## 6. Plano de Testes

- Unit: `OverpassImporter` com response mockado → grava POIs corretos.
- Integration: rodar import real em uma cidade de teste e validar count > 0.
- E2E: prompt "casa perto da WEG" → encontra POI WEG → retorna imóveis dentro de 2km.
- Regressão: comparar resultados do plano antigo (`config/proximity.php`) vs novo em 20 prompts canônicos.

## 7. Adicionando uma Cidade Nova

Passo único:

```bash
php artisan pois:import --city="Blumenau" --state=SC
```

Combinado com o geocoding (plano 04) dos imóveis daquela cidade, a busca por IA passa a funcionar **sem editar nenhum config**.

## 8. Esforço

**3–5 dias:**
- Migration + schema: 0,5 dia
- Overpass importer: 1 dia
- Mapeamento de categorias + alias generator: 1 dia
- Integração no `AiPropertySearchService`: 1 dia
- Testes + deprecação do `proximity.php`: 1 dia

## 9. Riscos

- **OSM tem cobertura desigual**. Mitigação: criar UI no admin pra cadastrar POI manualmente (poucos casos por cidade); ainda assim é ordem de magnitude menor que curar `proximity.php`.
- **POIs com nomes ambíguos** ("Centro" como nome de POI vs como bairro). Mitigação: categoria + cidade no filtro; `Centro` continua sendo um bairro (já em `scrapy-properties.bairro`), não vira POI.
- **Volume Overpass**: rate limit público é tolerável pra import esporádico; pra muitas cidades em paralelo, considerar mirror dedicado.
