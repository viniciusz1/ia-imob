<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\NewPropertyModuleInterest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class NewPropertyModuleInterestTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->app[PermissionRegistrar::class]->forgetCachedPermissions();
        Permission::firstOrCreate([
            'name' => 'properties.view',
            'guard_name' => 'web',
        ]);
    }

    public function test_agency_user_can_record_and_read_module_interest(): void
    {
        $agency = Agency::factory()->create();
        $user = User::factory()->for($agency)->create();
        $user->givePermissionTo('properties.view');
        Sanctum::actingAs($user);

        $this->getJson('/api/v1/new-properties/interest')
            ->assertOk()
            ->assertExactJson(['data' => null]);

        $this->putJson('/api/v1/new-properties/interest', [
            'intended_uses' => ['monitor_new_listings', 'match_clients'],
            'notes' => 'Quero receber oportunidades antes dos concorrentes.',
        ])->assertCreated()
            ->assertJsonPath('data.intended_uses.0', 'monitor_new_listings')
            ->assertJsonPath('data.intended_uses.1', 'match_clients')
            ->assertJsonPath('data.notes', 'Quero receber oportunidades antes dos concorrentes.');

        $this->assertDatabaseHas('new_property_module_interests', [
            'agency_id' => $agency->id,
            'user_id' => $user->id,
            'notes' => 'Quero receber oportunidades antes dos concorrentes.',
        ]);

        $this->getJson('/api/v1/new-properties/interest')
            ->assertOk()
            ->assertJsonPath('data.intended_uses.0', 'monitor_new_listings');
    }

    public function test_recording_again_updates_the_same_interest(): void
    {
        $agency = Agency::factory()->create();
        $user = User::factory()->for($agency)->create();
        $user->givePermissionTo('properties.view');
        Sanctum::actingAs($user);

        $this->putJson('/api/v1/new-properties/interest', [
            'intended_uses' => ['monitor_new_listings'],
        ])->assertCreated();

        $this->putJson('/api/v1/new-properties/interest', [
            'intended_uses' => ['prospect_owners'],
            'notes' => 'Minha prioridade é captação.',
        ])->assertOk()
            ->assertJsonPath('data.intended_uses.0', 'prospect_owners');

        $this->assertDatabaseCount('new_property_module_interests', 1);
        $this->assertDatabaseHas('new_property_module_interests', [
            'agency_id' => $agency->id,
            'user_id' => $user->id,
            'notes' => 'Minha prioridade é captação.',
        ]);
    }

    public function test_interests_are_isolated_by_agency_and_user(): void
    {
        $firstAgency = Agency::factory()->create();
        $secondAgency = Agency::factory()->create();
        $firstUser = User::factory()->for($firstAgency)->create();
        $secondUser = User::factory()->for($secondAgency)->create();
        $firstUser->givePermissionTo('properties.view');
        $secondUser->givePermissionTo('properties.view');

        NewPropertyModuleInterest::withoutGlobalScopes()->create([
            'agency_id' => $firstAgency->id,
            'user_id' => $firstUser->id,
            'intended_uses' => ['follow_market'],
            'notes' => 'Resposta de outra agência.',
        ]);

        Sanctum::actingAs($secondUser);

        $this->getJson('/api/v1/new-properties/interest')
            ->assertOk()
            ->assertExactJson(['data' => null]);
    }

    public function test_interest_requires_a_supported_intended_use(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo('properties.view');
        Sanctum::actingAs($user);

        $this->putJson('/api/v1/new-properties/interest', [
            'intended_uses' => ['unsupported_use'],
            'notes' => str_repeat('a', 1001),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['intended_uses.0', 'notes']);

        $this->assertDatabaseCount('new_property_module_interests', 0);
    }

    public function test_user_without_property_access_cannot_use_validation_entry(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->getJson('/api/v1/new-properties/interest')->assertForbidden();
        $this->putJson('/api/v1/new-properties/interest', [
            'intended_uses' => ['follow_market'],
        ])->assertForbidden();
    }

    public function test_platform_admin_cannot_record_agency_interest(): void
    {
        $platformAdmin = User::factory()->create(['agency_id' => null]);
        $platformAdmin->givePermissionTo('properties.view');
        Sanctum::actingAs($platformAdmin);

        $this->putJson('/api/v1/new-properties/interest', [
            'intended_uses' => ['follow_market'],
        ])->assertForbidden();

        $this->assertDatabaseCount('new_property_module_interests', 0);
    }
}
