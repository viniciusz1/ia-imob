<?php

namespace Tests\Feature\Crawler;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MarketDataContractApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_operator_can_validate_impact_and_atomically_activate_contract_versions(): void
    {
        $this->seed();
        $admin = User::query()->where('email', 'platform@imobiliaria.com')->firstOrFail();

        $this->actingAs($admin)->postJson('/api/v1/admin/crawler/crawl-agencies', [
            'name' => 'Fonte Afetada',
            'slug' => 'fonte-afetada',
            'base_url' => 'https://affected.example.com',
            'root_domain' => 'affected.example.com',
        ])->assertCreated();

        $legacyFields = \App\Models\Crawler\MarketDataContractVersion::query()
            ->where('status', 'active')
            ->sole()
            ->fields;

        $first = $this->actingAs($admin)
            ->postJson('/api/v1/admin/crawler/market-data-contracts', [
                'fields' => [...$legacyFields, ['name' => 'title', 'type' => 'string', 'required' => false, 'normalization' => ['trim']]],
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.version', 2)
            ->json('data');

        $this->actingAs($admin)
            ->postJson("/api/v1/admin/crawler/market-data-contracts/{$first['id']}/validate")
            ->assertOk()
            ->assertJsonPath('data.compatibility', 'additive_optional');

        $this->actingAs($admin)
            ->postJson("/api/v1/admin/crawler/market-data-contracts/{$first['id']}/activate")
            ->assertOk()
            ->assertJsonPath('data.status', 'active');

        $second = $this->actingAs($admin)
            ->postJson('/api/v1/admin/crawler/market-data-contracts', [
                'fields' => [...$legacyFields, ['name' => 'title', 'type' => 'string', 'required' => false, 'normalization' => ['trim']], ['name' => 'reference_code', 'type' => 'string', 'required' => true, 'normalization' => ['trim']]],
            ])
            ->assertCreated()
            ->assertJsonPath('data.version', 3)
            ->json('data');

        $this->actingAs($admin)
            ->postJson("/api/v1/admin/crawler/market-data-contracts/{$second['id']}/validate")
            ->assertOk()
            ->assertJsonPath('data.compatibility', 'incompatible')
            ->assertJsonCount(1, 'data.affected_agencies');

        $this->actingAs($admin)
            ->postJson("/api/v1/admin/crawler/market-data-contracts/{$second['id']}/activate")
            ->assertOk()
            ->assertJsonPath('data.status', 'active');

        $this->actingAs($admin)
            ->getJson('/api/v1/admin/crawler/market-data-contracts')
            ->assertOk()
            ->assertJsonPath('data.0.status', 'active')
            ->assertJsonPath('data.1.status', 'superseded')
            ->assertJsonPath('data.2.status', 'superseded');
    }
}
