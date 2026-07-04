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
            'source_name' => fake()->slug(),
            'status' => 'completed',
            'started_at' => now(),
            'completed_at' => now(),
            'error_message' => null,
            'properties_count' => fake()->numberBetween(1, 100),
            'latest' => true,
        ];
    }
}
