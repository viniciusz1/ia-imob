<?php

namespace Tests\Feature;

use App\Models\NeighborhoodReferencePoint;
use App\Models\PointOfInterest;
use App\Services\Ai\Providers\LlmProvider;
use App\Services\AiPropertySearchService;
use App\Services\Overpass\ProximityResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProximityResolverTest extends TestCase
{
    use RefreshDatabase;

    public function test_resolves_poi_to_nearby_neighborhood_locations(): void
    {
        $this->seedCityReferences();

        $resolved = app(ProximityResolver::class)->resolve([
            'reference' => 'weg',
            'city' => 'Jaraguá do Sul',
            'radius_hint' => 'perto',
        ], 'Jaraguá do Sul');

        $this->assertNotNull($resolved);
        $this->assertTrue($resolved['proximity']['resolved']);
        $this->assertSame('WEG', $resolved['proximity']['matched_name']);
        $this->assertSame('poi', $resolved['proximity']['source']);
        $this->assertContains('Centro', array_column($resolved['locations'], 'bairro'));
        $this->assertContains('Vila Lenzi', array_column($resolved['locations'], 'bairro'));
        $this->assertNotContains('Rio Cerro II', array_column($resolved['locations'], 'bairro'));
    }

    public function test_prefers_neighborhood_for_centro_reference(): void
    {
        $this->seedCityReferences();

        $resolved = app(ProximityResolver::class)->resolve([
            'reference' => 'centro',
            'city' => 'Jaraguá do Sul',
            'radius_hint' => 'muito_perto',
        ], 'Jaraguá do Sul');

        $this->assertNotNull($resolved);
        $this->assertSame('Centro', $resolved['proximity']['matched_name']);
        $this->assertSame('neighborhood', $resolved['proximity']['source']);
        $this->assertContains('Centro', array_column($resolved['locations'], 'bairro'));
    }

    public function test_ai_prompt_normalization_uses_overpass_proximity_instead_of_static_catalog(): void
    {
        config(['ai.cache.enabled' => false]);
        $this->seedCityReferences();

        $this->app->instance(LlmProvider::class, new class implements LlmProvider {
            public function chat(array $messages, array $responseFormat = []): string
            {
                return '{"tipo":["Apartamento"],"proximity":{"reference":"centro","city":"Jaraguá do Sul","radius_hint":"perto"}}';
            }
        });

        $filters = app(AiPropertySearchService::class)->parsePrompt('apartamento perto do centro', 'Jaraguá do Sul');

        $this->assertSame(['Apartamento'], $filters['tipo']);
        $this->assertTrue($filters['proximity']['resolved']);
        $this->assertSame('Centro', $filters['proximity']['matched_name']);
        $this->assertContains('Centro', array_column($filters['locations'], 'bairro'));
    }

    private function seedCityReferences(): void
    {
        PointOfInterest::create([
            'osm_type' => 'node',
            'osm_id' => 1,
            'name' => 'WEG',
            'category' => 'industry',
            'city' => 'Jaraguá do Sul',
            'state' => 'SC',
            'lat' => -26.4851,
            'lng' => -49.0664,
            'aliases' => ['weg', 'perto da weg'],
            'raw_tags' => ['office' => 'company'],
            'imported_at' => now(),
        ]);

        NeighborhoodReferencePoint::create([
            'osm_type' => 'node',
            'osm_id' => 10,
            'name' => 'Centro',
            'city' => 'Jaraguá do Sul',
            'state' => 'SC',
            'lat' => -26.4866,
            'lng' => -49.0711,
            'aliases' => ['centro', 'bairro centro'],
            'raw_tags' => ['place' => 'neighbourhood'],
            'imported_at' => now(),
        ]);

        NeighborhoodReferencePoint::create([
            'osm_type' => 'node',
            'osm_id' => 11,
            'name' => 'Vila Lenzi',
            'city' => 'Jaraguá do Sul',
            'state' => 'SC',
            'lat' => -26.4848,
            'lng' => -49.081,
            'aliases' => ['vila lenzi', 'lenzi'],
            'raw_tags' => ['place' => 'neighbourhood'],
            'imported_at' => now(),
        ]);

        NeighborhoodReferencePoint::create([
            'osm_type' => 'node',
            'osm_id' => 12,
            'name' => 'Rio Cerro II',
            'city' => 'Jaraguá do Sul',
            'state' => 'SC',
            'lat' => -26.545,
            'lng' => -49.155,
            'aliases' => ['rio cerro ii'],
            'raw_tags' => ['place' => 'neighbourhood'],
            'imported_at' => now(),
        ]);
    }
}
