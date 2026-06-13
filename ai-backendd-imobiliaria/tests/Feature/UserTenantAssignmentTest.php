<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Locks ADR 0001: every User belongs to exactly one Tenant. Regression for the
 * NOT NULL violation on property_valuations.tenant_id that surfaced when a
 * tenant-less user (created without an agency) tried to create a valuation.
 */
class UserTenantAssignmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_created_user_inherits_the_authenticated_admins_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $this->actingAs(User::factory()->for($tenant)->create());

        $created = app(UserService::class)->create([
            'name' => 'Novo Corretor',
            'email' => 'novo@imobiliaria.com',
            'username' => 'novocorretor',
            'phone' => '(47) 99999-1234',
            'person_type' => 'F',
            'password' => 'password123',
        ]);

        $this->assertSame($tenant->id, $created->tenant_id);
    }

    public function test_database_rejects_a_user_without_a_tenant(): void
    {
        $this->expectException(QueryException::class);

        User::factory()->create(['tenant_id' => null]);
    }
}
