# Plano Técnico 04: Geocodificação dos Imóveis + PostGIS

## 1. Motivação

Sem coordenadas, "perto de X" depende da lista hardcoded em `config/proximity.php`. Com `lat`/`lng` e PostGIS, "perto da WEG num raio de 2 km" vira uma query objetiva — e desbloqueia o plano 05 (POIs do OSM).

## 2. Mudanças no Schema

### 2.1 Habilitar PostGIS

```php
DB::statement('CREATE EXTENSION IF NOT EXISTS postgis;');
```

### 2.2 Adicionar colunas em `scrapy-properties`

```php
Schema::table('scrapy-properties', function (Blueprint $table) {
    $table->decimal('lat', 10, 7)->nullable()->index();
    $table->decimal('lng', 10, 7)->nullable()->index();
    $table->string('geocode_quality', 32)->nullable();
    // 'exact' (endereço completo), 'neighborhood' (centroide do bairro),
    // 'city' (centroide da cidade), 'failed'
    $table->timestamp('geocoded_at')->nullable();
});

DB::statement('ALTER TABLE "scrapy-properties"
    ADD COLUMN geom geography(Point, 4326)
    GENERATED ALWAYS AS (
        CASE WHEN lat IS NOT NULL AND lng IS NOT NULL
        THEN ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
        END
    ) STORED;');

DB::statement('CREATE INDEX idx_scrapy_props_geom ON "scrapy-properties" USING GIST (geom);');
```

> Usamos `geography` (não `geometry`) para que `ST_DWithin(a, b, 2000)` aceite distância em metros direto, sem reprojeção.

## 3. Pipeline de Geocodificação

### 3.1 Provider

Criar `app/Services/Geocoding/GeocoderInterface.php` com implementações:
- `NominatimGeocoder` (OpenStreetMap, **gratuito**, 1 req/s) — default.
- `GoogleGeocoder` (pago, mais preciso) — fallback opcional.

```php
interface GeocoderInterface {
    public function geocode(string $address, ?string $city, ?string $state): ?GeocodeResult;
}

final class GeocodeResult {
    public function __construct(
        public readonly float $lat,
        public readonly float $lng,
        public readonly string $quality, // 'exact' | 'neighborhood' | 'city'
    ) {}
}
```

### 3.2 Estratégia de fallback em cascata

Para cada imóvel:
1. Tentar `endereco_completo + bairro + cidade` → `quality = 'exact'`.
2. Se falhar, `bairro + cidade` → `quality = 'neighborhood'`.
3. Se falhar, `cidade` → `quality = 'city'`.
4. Se tudo falhar → `quality = 'failed'`.

### 3.3 Job + Comando Artisan

```php
class GeocodePropertyJob implements ShouldQueue { /* ... */ }

// Comando manual:
php artisan properties:geocode --where=geocoded_at:null --limit=1000
```

### 3.4 Hook no scraper

Quando o scraper insere/atualiza um imóvel, despacha o `GeocodePropertyJob`. Job é idempotente.

### 3.5 Rate limiting

Nominatim exige ≤1 req/s e `User-Agent` identificável. Usar `Redis::throttle('geocode', 1, 1)` no job.

## 4. Uso em Buscas

### 4.1 Novo filtro no scope

```php
if (!empty($filters['near'])) {
    [$lat, $lng, $meters] = $filters['near'];
    $query->whereRaw(
        'ST_DWithin(geom, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)',
        [$lng, $lat, $meters]
    );
    // Opcional: ordenar por distância
    $query->orderByRaw('geom <-> ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography', [$lng, $lat]);
}
```

### 4.2 Frontend (futuro)

Permitir "buscar perto de mim" → o navegador envia `lat`/`lng` do usuário, backend resolve sem passar pelo LLM. Pode ficar como follow-up; não é blocker.

## 5. Migration de Backfill

Após deploy do schema, rodar:

```bash
php artisan properties:geocode --all --batch=500
```

Tempo estimado (Nominatim, 1 req/s): ~3h pra 10k imóveis. Pode acelerar usando Google em lote pago.

## 6. Plano de Testes

- Unit: `NominatimGeocoder` com responses mockados (3 cenários: exact / neighborhood / failed).
- Integration: job geocodifica 10 imóveis reais e popula `lat/lng/quality`.
- Query: `ST_DWithin` retorna apenas imóveis dentro do raio (fixture com pontos conhecidos).

## 7. Esforço

**1–2 semanas:**
- Migration + extensão: 0,5 dia
- Providers + interface: 1 dia
- Job + comando: 1 dia
- Cascata de fallback: 1 dia
- Backfill em produção: 0,5 dia (espera assíncrona)
- Testes: 1 dia
- Integração no scraper existente: 1 dia

## 8. Riscos

- **Endereços ruins do scraper** (sem número, sem rua). Mitigado pela cascata — caímos no centroide do bairro com `quality='neighborhood'`, ainda utilizável.
- **Nominatim usage policy** — para volumes maiores (>50k/dia), considerar self-host do Nominatim ou usar Google.
- **Coluna `geom` gerada**: precisa Postgres 12+ (provavelmente já temos).
