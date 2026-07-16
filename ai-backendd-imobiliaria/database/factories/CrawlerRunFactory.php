<?php

namespace Database\Factories;

use App\Models\CrawlerRun;
use Illuminate\Database\Eloquent\Factories\Factory;

class CrawlerRunFactory extends Factory
{
    protected $model = CrawlerRun::class;

    public function definition(): array
    {
        return [
            'operation_id' => null,
            'crawl_agency_id' => null,
            'discovery_snapshot_id' => null,
            'extraction_profile_id' => null,
            'market_data_contract_version_id' => null,
            'quality_policy_version_id' => null,
            'technical_state' => 'succeeded',
            'result_kind' => 'full',
            'publication_state' => 'published',
            'publishable' => true,
            'started_at' => now(),
            'completed_at' => now(),
            'raw_count' => fake()->numberBetween(1, 100),
            'normalized_count' => fake()->numberBetween(1, 100),
            'rejected_count' => 0,
            'error_count' => 0,
            'error_summary' => [],
        ];
    }
}
