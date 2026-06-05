<?php

namespace Tests\Feature;

use App\Models\Property;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicPropertyDetailApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_shows_a_published_property_by_slug(): void
    {
        $acme = Tenant::factory()->create(['slug' => 'acme']);
        $property = Property::factory()->create([
            'tenant_id' => $acme->id,
            'is_published' => true,
            'title' => 'Casa com vista',
        ]);

        $response = $this->getJson('http://acme.localhost/api/public/properties/' . $property->slug);

        $response->assertOk()
            ->assertJsonPath('data.title', 'Casa com vista')
            ->assertJsonPath('data.slug', $property->slug);
    }

    public function test_returns_404_for_unpublished_property(): void
    {
        $acme = Tenant::factory()->create(['slug' => 'acme']);
        $property = Property::factory()->create(['tenant_id' => $acme->id, 'is_published' => false]);

        $this->getJson('http://acme.localhost/api/public/properties/' . $property->slug)
            ->assertNotFound();
    }

    public function test_returns_404_for_a_property_belonging_to_another_tenant(): void
    {
        $acme = Tenant::factory()->create(['slug' => 'acme']);
        $other = Tenant::factory()->create(['slug' => 'other']);
        $property = Property::factory()->create(['tenant_id' => $other->id, 'is_published' => true]);

        $this->getJson('http://acme.localhost/api/public/properties/' . $property->slug)
            ->assertNotFound();
    }
}
