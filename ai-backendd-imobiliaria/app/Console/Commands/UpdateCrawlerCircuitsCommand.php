<?php

namespace App\Console\Commands;

use App\Services\Crawler\CrawlerCircuitService;
use Illuminate\Console\Command;

class UpdateCrawlerCircuitsCommand extends Command
{
    protected $signature = 'crawler:update-circuits';

    protected $description = 'Update Crawl Agency circuit breakers from completed production operations';

    public function handle(CrawlerCircuitService $circuits): int
    {
        $this->info(sprintf('%d production result(s) evaluated.', $circuits->update()));

        return self::SUCCESS;
    }
}
