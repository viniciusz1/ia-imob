<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\UserService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UserRoleAssignmentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('db:seed', ['--class' => 'RoleSeeder']);
        $this->artisan('db:seed', ['--class' => 'PermissionSeeder']);
    }

    public function test_can_assign_role_to_user_during_creation_via_user_service()
    {
        $role = Role::create(['name' => 'Broker Test']);
        $userService = app(UserService::class);

        $data = [
            'name' => 'Test User',
            'email' => 'test@imobiliaria.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role_id' => $role->id,
            'person_type' => 'F',
            'username' => 'testuser',
            'phone' => '11999999999',
        ];

        $user = $userService->create($data);

        $this->assertTrue($user->hasRole('Broker Test'));
    }

    public function test_can_update_user_role_via_user_service()
    {
        $role1 = Role::create(['name' => 'Role 1 Test']);
        $role2 = Role::create(['name' => 'Role 2 Test']);

        $user = User::factory()->create();
        $user->assignRole($role1);

        $this->assertTrue($user->hasRole('Role 1 Test'));

        $userService = app(UserService::class);
        $userService->update($user, ['role_id' => $role2->id]);

        $this->assertTrue($user->refresh()->hasRole('Role 2 Test'));
        $this->assertFalse($user->hasRole('Role 1 Test'));
    }
}
