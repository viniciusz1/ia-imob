<?php

namespace Tests\Feature;

use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class PermissionSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_permission_seeder_creates_valuation_permissions(): void
    {
        $this->seed(PermissionSeeder::class);

        $this->assertTrue(Permission::where('name', 'valuations.create')->exists());
        $this->assertTrue(Permission::where('name', 'valuations.view')->exists());
    }

    public function test_permission_seeder_creates_agency_config_refinement_permission(): void
    {
        $this->seed(PermissionSeeder::class);

        $this->assertTrue(Permission::where('name', 'agency_configs.view')->exists());
        $this->assertTrue(Permission::where('name', 'agency_configs.manage')->exists());
        $this->assertTrue(Permission::where('name', 'agency_configs.refine')->exists());
    }
}
