<?php

namespace Tests\Feature\Crawler;

use App\Models\Crawler\MarketDataContractVersion;
use Database\Seeders\LegacyMarketDataContractSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LegacyMarketDataContractSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_seeds_the_legacy_python_contract_as_the_initial_active_contract(): void
    {
        $this->seed();

        $contract = MarketDataContractVersion::query()->sole();

        $this->assertSame('active', $contract->status);
        $this->assertSame(1, $contract->version);
        $this->assertSame([
            'bairro',
            'cidade',
            'imagem',
            'tipo_imovel',
            'url',
            'valor',
        ], collect($contract->fields)->where('required', true)->pluck('name')->sort()->values()->all());
        $this->assertCount(30, $contract->fields);
        $this->assertSame('currency', collect($contract->fields)->firstWhere('name', 'valor')['coerce']);
        $this->assertSame('Valor do imóvel', collect($contract->fields)->firstWhere('name', 'valor')['description']);
        $this->assertSame('boolean', collect($contract->fields)->firstWhere('name', 'piscina')['coerce']);
    }

    public function test_it_does_not_create_a_duplicate_legacy_contract(): void
    {
        $this->seed();

        $this->seed(LegacyMarketDataContractSeeder::class);

        $this->assertDatabaseCount('crawler.market_data_contract_versions', 1);
    }
}
