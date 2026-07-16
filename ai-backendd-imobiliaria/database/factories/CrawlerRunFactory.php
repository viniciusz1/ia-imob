<?php

namespace Database\Factories;

use App\Models\Crawler\CrawlAgency;
use App\Models\CrawlerRun;
use Illuminate\Database\Eloquent\Factories\Factory;

class CrawlerRunFactory extends Factory
{
    protected $model = CrawlerRun::class;

    public function configure(): static
    {
        return $this->afterCreating(function (CrawlerRun $run): void {
            if ($run->publication_state === 'published' && $run->crawl_agency_id !== null) {
                CrawlAgency::query()->whereKey($run->crawl_agency_id)->update([
                    'current_published_crawl_run_id' => $run->id,
                ]);
            }
        });
    }

    public function definition(): array
    {
        return [
            'operation_id' => null,
            'crawl_agency_id' => fn () => CrawlAgency::query()->create([
                'name' => fake()->company(),
                'slug' => fake()->unique()->slug(),
                'base_url' => fake()->unique()->url(),
                'root_domain' => fake()->unique()->domainName(),
                'lifecycle_state' => 'active',
            ])->id,
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
