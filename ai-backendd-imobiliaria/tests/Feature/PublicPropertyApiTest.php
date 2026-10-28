<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\Property;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PublicPropertyApiTest extends TestCase
{
    use RefreshDatabase;

    private function getPublicProperties(string $host = 'acme.localhost', string $query = ''): \Illuminate\Testing\TestResponse
    {
        return $this
            ->withHeader('X-Agency-Host', $host)
            ->getJson('/api/v1/public/properties'.$query);
    }

    public function test_lists_only_published_properties_of_the_resolved_agency(): void
    {
        $acme = Agency::factory()->create(['slug' => 'acme']);
        $other = Agency::factory()->create(['slug' => 'other']);

        Property::factory()->count(2)->create(['agency_id' => $acme->id, 'is_published' => true]);
        Property::factory()->create(['agency_id' => $acme->id, 'is_published' => false]);
        Property::factory()->create(['agency_id' => $other->id, 'is_published' => true]);

        $response = $this->getPublicProperties();

        $response->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_unknown_subdomain_returns_404(): void
    {
        $this->getPublicProperties('nope.localhost')->assertNotFound();
    }

    public function test_filters_by_purpose(): void
    {
        $acme = Agency::factory()->create(['slug' => 'acme']);
        Property::factory()->count(2)->create(['agency_id' => $acme->id, 'is_published' => true, 'purpose' => 'venda']);
        Property::factory()->create(['agency_id' => $acme->id, 'is_published' => true, 'purpose' => 'locacao']);

        $response = $this->getPublicProperties(query: '?purpose=venda');

        $response->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_public_listing_generates_missing_property_slugs(): void
    {
        $acme = Agency::factory()->create(['slug' => 'acme']);
        $propertyWithSlug = Property::factory()->create([
            'agency_id' => $acme->id,
            'is_published' => true,
        ]);
        $propertyWithoutSlug = Property::factory()->create([
            'agency_id' => $acme->id,
            'is_published' => true,
        ]);

        DB::table('properties')->where('id', $propertyWithoutSlug->id)->update(['slug' => null]);

        $response = $this->getPublicProperties();

        $generatedSlug = $propertyWithoutSlug->fresh()->slug;

        $response->assertOk()
            ->assertJsonCount(2, 'data');

        $this->assertNotNull($generatedSlug);
        $this->assertContains($generatedSlug, collect($response->json('data'))->pluck('slug'));
        $this->assertContains($propertyWithSlug->slug, collect($response->json('data'))->pluck('slug'));
    }

    public function test_hides_internal_fields_and_respects_privacy_flags(): void
    {
        $acme = Agency::factory()->create(['slug' => 'acme']);

        Property::factory()->create([
            'agency_id' => $acme->id,
            'is_published' => true,
            'show_price' => false,
            'show_exact_address' => false,
            'street' => 'Rua Secreta',
            'number' => '123',
            'sale_price' => 123456,
            'internal_notes' => 'segredo interno',
            'keys_location' => 'gaveta do corretor',
            'latitude' => -26.9011,
            'longitude' => -48.6655,
        ]);

        $response = $this->getPublicProperties();
        $response->assertOk();

        $content = $response->getContent();
        $this->assertStringNotContainsString('segredo interno', $content);
        $this->assertStringNotContainsString('gaveta do corretor', $content);
        $this->assertStringNotContainsString('Rua Secreta', $content);

        $item = $response->json('data.0');
        $this->assertFalse($item['pricing']['show_price']);
        $this->assertNull($item['pricing']['sale_price']);
        $this->assertArrayNotHasKey('street', $item['location']);
        // Coordinate coarsened to ~1km (2 decimals), not the exact value.
        $this->assertEquals(-26.90, $item['location']['latitude']);
    }
}
