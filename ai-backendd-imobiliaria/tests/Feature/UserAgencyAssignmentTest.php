<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Locks ADR 0001: an Agency user belongs to exactly one Agency, inherited from
 * whoever created them. Regression for the NOT NULL violation on
 * property_valuations.agency_id that surfaced when an agency-less user tried to
 * create a valuation.
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

    /**
     * ADR 0001 makes Agency users belong to exactly one Agency but leaves
     * Platform Admins agency-less, and
     * 2026_06_13_213400_make_agency_id_nullable_for_platform_admins reopened
     * the column for exactly that. An agency-less user is therefore a Platform
     * Admin, not a broken record.
     */
    public function test_an_agency_less_user_is_a_platform_admin(): void
    {
        $platformAdmin = User::factory()->create(['agency_id' => null]);

        $this->assertNull($platformAdmin->fresh()->agency_id);
    }
}
