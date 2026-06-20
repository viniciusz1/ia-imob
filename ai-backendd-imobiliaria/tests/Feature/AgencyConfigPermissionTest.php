<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\SitemapAgency;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AgencyConfigPermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_without_agency_config_view_permission_cannot_list_configs(): void
    {
        $agency = Agency::factory()->create();
        $user = User::factory()->for($agency)->create();
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/agency-configs');

        $response->assertForbidden();
    }

    public function test_user_with_agency_config_view_permission_can_list_configs(): void
    {
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $agency = Agency::factory()->create();
        $user = User::factory()->for($agency)->create();
        $user->givePermissionTo('agency_configs.view');
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/agency-configs');

        $response->assertOk();
    }

    public function test_user_with_view_permission_cannot_create_agency_config(): void
    {
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $agency = Agency::factory()->create();
        $user = User::factory()->for($agency)->create();
        $user->givePermissionTo('agency_configs.view');
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/agency-configs/sitemap', [
            'name' => 'Nova Agência',
            'domain' => 'https://example.com',
            'sitemap_url' => 'https://example.com/sitemap.xml',
            'is_active' => true,
        ]);

        $response->assertForbidden();
    }

    public function test_user_with_manage_permission_can_create_agency_config(): void
    {
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $agency = Agency::factory()->create();
        $user = User::factory()->for($agency)->create();
        $user->givePermissionTo('agency_configs.manage');
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/agency-configs/sitemap', [
            'name' => 'Nova Agência',
            'domain' => 'https://example.com',
            'sitemap_url' => 'https://example.com/sitemap.xml',
            'is_active' => true,
        ]);

        $response->assertCreated();
    }

    public function test_user_without_refine_permission_cannot_view_refinement_bench(): void
    {
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $agency = Agency::factory()->create();
        $user = User::factory()->for($agency)->create();
        $user->givePermissionTo('agency_configs.view');
        Sanctum::actingAs($user);

        $sitemapAgency = SitemapAgency::query()->create([
            'name' => 'Alpha Imóveis',
            'domain' => 'alpha.test',
            'sitemap_url' => 'https://alpha.test/sitemap.xml',
            'is_active' => true,
        ]);

        $response = $this->getJson("/api/v1/agency-configs/sitemap/{$sitemapAgency->id}/refinement");

        $response->assertForbidden();
    }

    public function test_user_with_refine_permission_can_view_refinement_bench_without_evidence(): void
    {
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $agency = Agency::factory()->create();
        $user = User::factory()->for($agency)->create();
        $user->givePermissionTo('agency_configs.refine');
        Sanctum::actingAs($user);

        $sitemapAgency = SitemapAgency::query()->create([
            'name' => 'Alpha Imóveis',
            'domain' => 'alpha.test',
            'sitemap_url' => 'https://alpha.test/sitemap.xml',
            'is_active' => true,
        ]);

        $response = $this->getJson("/api/v1/agency-configs/sitemap/{$sitemapAgency->id}/refinement");

        $response->assertOk()
            ->assertJsonPath('data.agency.name', 'Alpha Imóveis')
            ->assertJsonPath('data.agency.agency_type', 'sitemap')
            ->assertJsonPath('data.evidence_available', false)
            ->assertJsonCount(0, 'data.evidence');
    }

    public function test_refinement_bench_returns_evidence_from_latest_successful_attempt(): void
    {
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $agency = Agency::factory()->create();
        $user = User::factory()->for($agency)->create();
        $user->givePermissionTo('agency_configs.refine');
        Sanctum::actingAs($user);

        $sitemapAgency = SitemapAgency::query()->create([
            'name' => 'Alpha Imóveis',
            'domain' => 'alpha.test',
            'sitemap_url' => 'https://alpha.test/sitemap.xml',
            'is_active' => true,
        ]);

        $oldAttemptId = DB::table('agency_onboarding_attempts')->insertGetId([
            'agency_type' => 'sitemap',
            'agency_id' => $sitemapAgency->id,
            'submitted_url' => 'https://alpha.test',
            'derived_domain' => 'alpha.test',
            'outcome' => 'active',
            'report' => json_encode([]),
            'created_at' => now()->subDay(),
            'updated_at' => now()->subDay(),
        ]);
        DB::table('agency_onboarding_evidence')->insert([
            'agency_onboarding_attempt_id' => $oldAttemptId,
            'sample_index' => 0,
            'url' => 'https://alpha.test/imovel/old',
            'content_hash' => hash('sha256', '<html>old</html>'),
            'html' => '<html>old</html>',
            'captured_at' => now()->subDay(),
            'created_at' => now()->subDay(),
            'updated_at' => now()->subDay(),
        ]);

        $latestAttemptId = DB::table('agency_onboarding_attempts')->insertGetId([
            'agency_type' => 'sitemap',
            'agency_id' => $sitemapAgency->id,
            'submitted_url' => 'https://alpha.test',
            'derived_domain' => 'alpha.test',
            'outcome' => 'active',
            'report' => json_encode([]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('agency_onboarding_evidence')->insert([
            'agency_onboarding_attempt_id' => $latestAttemptId,
            'sample_index' => 0,
            'url' => 'https://alpha.test/imovel/1',
            'content_hash' => hash('sha256', '<html>new</html>'),
            'html' => '<html>new</html>',
            'captured_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->getJson("/api/v1/agency-configs/sitemap/{$sitemapAgency->id}/refinement");

        $response->assertOk()
            ->assertJsonPath('data.evidence_available', true)
            ->assertJsonCount(1, 'data.evidence')
            ->assertJsonPath('data.evidence.0.url', 'https://alpha.test/imovel/1')
            ->assertJsonPath('data.evidence.0.sample_index', 0)
            ->assertJsonPath('data.evidence.0.html', '<html>new</html>');
    }

    public function test_user_without_refine_permission_cannot_save_refinement(): void
    {
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $agency = Agency::factory()->create();
        $user = User::factory()->for($agency)->create();
        $user->givePermissionTo('agency_configs.view');
        Sanctum::actingAs($user);

        $sitemapAgency = SitemapAgency::query()->create([
            'name' => 'Alpha Imóveis',
            'domain' => 'alpha.test',
            'sitemap_url' => 'https://alpha.test/sitemap.xml',
            'is_active' => true,
        ]);

        $response = $this->postJson("/api/v1/agency-configs/sitemap/{$sitemapAgency->id}/refinements", [
            'field_name' => 'tipo',
            'extractors' => [
                [
                    'priority' => 1,
                    'source_type' => 'css',
                    'selector_value' => 'h1::text',
                    'selector_index' => null,
                    'selector_join' => false,
                    'pipeline' => null,
                    'output_type' => 'text',
                    'is_optional' => false,
                ],
            ],
        ]);

        $response->assertForbidden();
    }

    public function test_save_refinement_updates_extractors_and_records_audit(): void
    {
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $agency = Agency::factory()->create();
        $user = User::factory()->for($agency)->create();
        $user->givePermissionTo('agency_configs.refine');
        Sanctum::actingAs($user);

        $sitemapAgency = SitemapAgency::query()->create([
            'name' => 'Alpha Imóveis',
            'domain' => 'alpha.test',
            'sitemap_url' => 'https://alpha.test/sitemap.xml',
            'is_active' => true,
        ]);

        $existing = AgencyFieldExtractor::query()->create([
            'agency_type' => 'sitemap',
            'agency_id' => $sitemapAgency->id,
            'field_name' => 'tipo',
            'priority' => 1,
            'source_type' => 'css',
            'selector_value' => 'h1::text',
            'selector_index' => null,
            'selector_params' => null,
            'selector_join' => false,
            'pipeline' => null,
            'output_type' => 'text',
            'is_optional' => false,
        ]);

        $attemptId = DB::table('agency_onboarding_attempts')->insertGetId([
            'agency_type' => 'sitemap',
            'agency_id' => $sitemapAgency->id,
            'submitted_url' => 'https://alpha.test',
            'derived_domain' => 'alpha.test',
            'outcome' => 'active',
            'report' => json_encode([]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->postJson("/api/v1/agency-configs/sitemap/{$sitemapAgency->id}/refinements", [
            'field_name' => 'tipo',
            'extractors' => [
                [
                    'id' => $existing->id,
                    'priority' => 1,
                    'source_type' => 'css',
                    'selector_value' => 'h2::text',
                    'selector_index' => null,
                    'selector_join' => false,
                    'pipeline' => null,
                    'output_type' => 'text',
                    'is_optional' => false,
                ],
                [
                    'priority' => 2,
                    'source_type' => 'xpath',
                    'selector_value' => '//h3',
                    'selector_index' => null,
                    'selector_join' => false,
                    'pipeline' => null,
                    'output_type' => 'text',
                    'is_optional' => true,
                ],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('data.extractors.0.selector_value', 'h2::text')
            ->assertJsonPath('data.extractors.1.selector_value', '//h3')
            ->assertJsonPath('data.agency.is_active', true);

        $this->assertDatabaseHas('agency_extractor_refinements', [
            'agency_type' => 'sitemap',
            'agency_id' => $sitemapAgency->id,
            'field_name' => 'tipo',
            'user_id' => $user->id,
            'agency_onboarding_attempt_id' => $attemptId,
        ]);

        $this->assertDatabaseHas('agency_field_extractors', [
            'id' => $existing->id,
            'selector_value' => 'h2::text',
        ]);

        $this->assertDatabaseHas('agency_field_extractors', [
            'agency_type' => 'sitemap',
            'agency_id' => $sitemapAgency->id,
            'field_name' => 'tipo',
            'priority' => 2,
            'selector_value' => '//h3',
        ]);
    }
}
