<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Locks the Agency boundary on `users`.
 *
 * `users` carries an `agency_id` but no Agency Scope, so nothing in the query
 * pipeline separates one Agency's users from another's — UserPolicy and
 * UserRepository do it, and these tests are what keep them honest.
 */
class UserAgencyIsolationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function adminOf(Agency $agency, string ...$permissions): User
    {
        $admin = User::factory()->for($agency)->create();
        $admin->givePermissionTo($permissions === [] ? ['users.view'] : $permissions);

        return $admin;
    }

    public function test_listing_users_returns_only_the_actors_own_agency(): void
    {
        $agency = Agency::factory()->create();
        $otherAgency = Agency::factory()->create();

        $admin = $this->adminOf($agency);
        $colleague = User::factory()->for($agency)->create();
        $outsider = User::factory()->for($otherAgency)->create();

        $response = $this->actingAs($admin)->getJson('/api/v1/users');

        $response->assertOk();

        $ids = array_column($response->json('data'), 'id');

        $this->assertContains($admin->id, $ids);
        $this->assertContains($colleague->id, $ids);
        $this->assertNotContains($outsider->id, $ids);
    }

    public function test_a_user_from_another_agency_cannot_be_read(): void
    {
        $admin = $this->adminOf(Agency::factory()->create());
        $outsider = User::factory()->for(Agency::factory()->create())->create();

        $this->actingAs($admin)
            ->getJson("/api/v1/users/{$outsider->id}")
            ->assertForbidden();
    }

    public function test_a_user_from_another_agency_cannot_be_updated(): void
    {
        $admin = $this->adminOf(Agency::factory()->create(), 'users.edit.all');
        $outsider = User::factory()->for(Agency::factory()->create())->create();

        $this->actingAs($admin)
            ->putJson("/api/v1/users/{$outsider->id}", ['name' => 'Sequestrado'])
            ->assertForbidden();

        $this->assertNotSame('Sequestrado', $outsider->fresh()->name);
    }

    public function test_a_user_from_another_agency_cannot_be_deleted(): void
    {
        $admin = $this->adminOf(Agency::factory()->create(), 'users.delete');
        $outsider = User::factory()->for(Agency::factory()->create())->create();

        $this->actingAs($admin)
            ->deleteJson("/api/v1/users/{$outsider->id}")
            ->assertForbidden();

        $this->assertNotSoftDeleted($outsider);
    }

    public function test_a_colleague_can_be_updated_with_the_edit_all_permission(): void
    {
        $agency = Agency::factory()->create();
        $admin = $this->adminOf($agency, 'users.edit.all');
        $colleague = User::factory()->for($agency)->create();

        $this->actingAs($admin)
            ->putJson("/api/v1/users/{$colleague->id}", ['name' => 'Nome Novo'])
            ->assertOk();

        $this->assertSame('Nome Novo', $colleague->fresh()->name);
    }

    public function test_editing_only_yourself_does_not_let_you_edit_a_colleague(): void
    {
        $agency = Agency::factory()->create();
        $user = $this->adminOf($agency, 'users.edit.self');
        $colleague = User::factory()->for($agency)->create();

        $this->actingAs($user)
            ->putJson("/api/v1/users/{$user->id}", ['name' => 'Eu Mesmo'])
            ->assertOk();

        $this->actingAs($user)
            ->putJson("/api/v1/users/{$colleague->id}", ['name' => 'Outro'])
            ->assertForbidden();
    }

    public function test_users_without_the_view_permission_cannot_list_at_all(): void
    {
        $user = User::factory()->for(Agency::factory()->create())->create();

        $this->actingAs($user)
            ->getJson('/api/v1/users')
            ->assertForbidden();
    }

    public function test_a_user_cannot_delete_themselves(): void
    {
        $admin = $this->adminOf(Agency::factory()->create(), 'users.delete');

        $this->actingAs($admin)
            ->deleteJson("/api/v1/users/{$admin->id}")
            ->assertForbidden();

        $this->assertNotSoftDeleted($admin);
    }

    public function test_a_platform_admin_does_not_administer_agency_users(): void
    {
        $platformAdmin = User::factory()->create(['agency_id' => null]);
        $platformAdmin->assignRole('Platform Admin');

        $agencyUser = User::factory()->for(Agency::factory()->create())->create();

        $this->actingAs($platformAdmin)
            ->getJson("/api/v1/users/{$agencyUser->id}")
            ->assertForbidden();
    }
}
