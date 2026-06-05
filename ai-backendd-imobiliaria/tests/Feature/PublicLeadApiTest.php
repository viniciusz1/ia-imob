<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\User;
use App\Notifications\LeadReceived;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PublicLeadApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_creates_a_tenant_scoped_lead_for_a_property(): void
    {
        $acme = Tenant::factory()->create(['slug' => 'acme']);
        $property = Property::factory()->create(['tenant_id' => $acme->id, 'is_published' => true]);

        $response = $this->postJson('http://acme.localhost/api/public/leads', [
            'name' => 'Maria Compradora',
            'phone' => '(47) 99999-0000',
            'email' => 'maria@example.com',
            'message' => 'Tenho interesse neste imóvel.',
            'property' => $property->slug,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('leads', [
            'tenant_id' => $acme->id,
            'property_id' => $property->id,
            'name' => 'Maria Compradora',
            'phone' => '(47) 99999-0000',
        ]);
    }

    public function test_requires_name_and_phone(): void
    {
        Tenant::factory()->create(['slug' => 'acme']);

        $this->postJson('http://acme.localhost/api/public/leads', [
            'email' => 'maria@example.com',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'phone']);
    }

    public function test_notifies_the_listing_broker(): void
    {
        Notification::fake();

        $acme = Tenant::factory()->create(['slug' => 'acme']);
        $broker = User::factory()->for($acme)->create();
        $property = Property::factory()->create([
            'tenant_id' => $acme->id,
            'is_published' => true,
            'broker_id' => $broker->id,
        ]);

        $this->postJson('http://acme.localhost/api/public/leads', [
            'name' => 'João Interessado',
            'phone' => '(47) 98888-0000',
            'property' => $property->slug,
        ])->assertCreated();

        Notification::assertSentTo($broker, LeadReceived::class);
    }

    public function test_is_rate_limited(): void
    {
        Tenant::factory()->create(['slug' => 'acme']);

        $payload = ['name' => 'Spammer', 'phone' => '(47) 90000-0000'];

        for ($i = 0; $i < 10; $i++) {
            $this->postJson('http://acme.localhost/api/public/leads', $payload)->assertCreated();
        }

        $this->postJson('http://acme.localhost/api/public/leads', $payload)->assertStatus(429);
    }
}
