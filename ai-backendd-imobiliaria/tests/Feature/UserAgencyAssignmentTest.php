<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Locks ADR 0001: every User belongs to exactly one Agency. Regression for the
 * NOT NULL violation on property_valuations.agency_id that surfaced when a
 * agency-less user (created without an agency) tried to create a valuation.
 */
class UserAgencyAssignmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_created_user_inherits_the_authenticated_admins_agency(): void
    {
        $agency = Agency::factory()->create();
        $this->actingAs(User::factory()->for($agency)->create());

        $created = app(UserService::class)->create([
            'name' => 'Novo Corretor',
            'email' => 'novo@imobiliaria.com',
            'username' => 'novocorretor',
            'phone' => '(47) 99999-1234',
            'person_type' => 'F',
            'password' => 'password123',
        ]);

        $this->assertSame($agency->id, $created->agency_id);
    }

    public function test_database_rejects_a_user_without_a_agency(): void
    {
        $this->expectException(QueryException::class);

        User::factory()->create(['agency_id' => null]);
    }
}
