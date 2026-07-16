<?php

namespace Database\Factories;

use App\Models\Crawler\ListingIdentity;
use App\Models\Crawler\ListingVersion;
use App\Models\CrawlerRun;
use App\Models\MarketProperty;
use Illuminate\Database\Eloquent\Factories\Factory;

class MarketPropertyFactory extends Factory
{
    protected $model = MarketProperty::class;

    public function configure(): static
    {
        return $this->afterCreating(function (MarketProperty $property): void {
            $run = $property->crawlerRun;
            if ($run->publication_state !== 'published' || $run->crawl_agency_id === null) {
                return;
            }
            $identity = ListingIdentity::query()->create([
                'crawl_agency_id' => $run->crawl_agency_id,
                'listing_key' => "factory:{$property->id}",
                'canonical_url' => $property->link_imovel,
                'inventory_state' => 'active',
                'current_market_property_id' => $property->id,
                'last_seen_crawl_run_id' => $run->id,
                'last_observed_at' => now(),
            ]);
            $version = ListingVersion::query()->create([
                'listing_identity_id' => $identity->id,
                'crawl_run_id' => $run->id,
                'market_property_id' => $property->id,
                'classification' => 'new',
                'content_hash' => hash('sha256', (string) $property->id),
                'observed_payload' => $property->payload,
                'observed_at' => now(),
            ]);
            $identity->update(['current_version_id' => $version->id]);
        });
    }

    public function definition(): array
    {
        return [
            'crawler_run_id' => CrawlerRun::factory(),
            'tipo' => 'Casa',
            'imobiliaria' => fake()->company(),
            'valor' => fake()->randomFloat(2, 100000, 2000000),
            'bairro' => fake()->word(),
            'cidade' => fake()->city(),
            'imagem' => fake()->url(),
            'link_imovel' => fake()->url(),
            'descricao' => fake()->sentence(),
            'quartos' => fake()->numberBetween(1, 5),
            'suites' => fake()->numberBetween(0, 3),
            'banheiros' => fake()->numberBetween(1, 4),
            'vagas' => fake()->numberBetween(0, 4),
            'area' => fake()->randomFloat(2, 40, 500),
            'aceita_permuta' => fake()->boolean(),
            'financiamento' => fake()->boolean(),
            'piscina' => fake()->boolean(),
            'churrasqueira' => fake()->boolean(),
            'academia' => fake()->boolean(),
            'salao_festas' => fake()->boolean(),
            'playground' => fake()->boolean(),
            'sacada' => fake()->boolean(),
            'mobiliado' => fake()->boolean(),
            'ar_condicionado' => fake()->boolean(),
            'lavanderia' => fake()->boolean(),
            'escritorio' => fake()->boolean(),
            'closet' => fake()->boolean(),
            'elevador' => fake()->boolean(),
            'portaria_24h' => fake()->boolean(),
            'andar' => fake()->optional()->word(),
            'posicao_solar' => fake()->optional()->word(),
            'ano_construcao' => fake()->optional()->year(),
            'payload' => [],
            'normalization_warnings' => [],
            'extraction_trace' => [],
        ];
    }
}
