<?php

namespace Tests\Feature;

use App\Models\Property;
use App\Models\Tenant;
use App\Models\TenantSiteSettings;
use App\Services\RevalidationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class RevalidationTest extends TestCase
{
    use RefreshDatabase;

    private string $url = 'https://public-site.test/api/revalidate';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.next.revalidate_url' => $this->url,
            'services.next.revalidation_secret' => 'test-secret',
        ]);
    }

    public function test_revalidation_service_posts_signed_tag_payload(): void
    {
        Http::fake([
            $this->url => Http::response(['revalidated' => ['tenant:acme.localhost']], 200),
        ]);

        app(RevalidationService::class)->revalidate(['tenant:acme.localhost']);

        $payload = json_encode(['tags' => ['tenant:acme.localhost']]);
        $signature = hash_hmac('sha256', $payload, 'test-secret');

        Http::assertSent(function (Request $request) use ($payload, $signature): bool {
            return $request->url() === $this->url
                && $request->body() === $payload
                && $request->header('X-Revalidation-Signature')[0] === $signature
                && $request->header('Content-Type')[0] === 'application/json';
        });
    }

    public function test_property_observer_revalidates_tenant_and_property_tags(): void
    {
        Http::fake([
            $this->url => Http::response(['revalidated' => []], 200),
        ]);

        $tenant = Tenant::factory()->create();
        $tenant->domains()->create([
            'hostname' => 'acme.localhost',
            'is_primary' => true,
        ]);

        $property = Property::factory()->create([
            'tenant_id' => $tenant->id,
            'slug' => 'casa-centro',
        ]);

        Http::assertSent(function (Request $request) use ($property): bool {
            $body = json_decode($request->body(), true);

            return $body === [
                'tags' => [
                    "property:{$property->slug}",
                    'tenant:acme.localhost',
                ],
            ];
        });
    }

    public function test_site_settings_observer_revalidates_tenant_tag(): void
    {
        Http::fake([
            $this->url => Http::response(['revalidated' => []], 200),
        ]);

        $tenant = Tenant::factory()->create();
        $tenant->domains()->create([
            'hostname' => 'acme.localhost',
            'is_primary' => true,
        ]);

        TenantSiteSettings::create([
            'tenant_id' => $tenant->id,
            'hero_title' => 'Nova chamada',
        ]);

        Http::assertSent(function (Request $request): bool {
            $body = json_decode($request->body(), true);

            return $body === [
                'tags' => ['tenant:acme.localhost'],
            ];
        });
    }
}
