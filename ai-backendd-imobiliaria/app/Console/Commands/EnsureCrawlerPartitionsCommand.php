<?php

namespace App\Console\Commands;

use App\Services\Crawler\CrawlerPartitionManager;
use Illuminate\Console\Command;

class EnsureCrawlerPartitionsCommand extends Command
{
    protected $signature = 'crawler:ensure-partitions {--months=3 : Number of future months to ensure}';

    protected $description = 'Create future monthly crawler partitions without deleting historical partitions';

    public function handle(CrawlerPartitionManager $partitions): int
    {
        $months = max(1, (int) $this->option('months'));
        $partitions->ensureMonths(now()->startOfMonth(), $months + 1);
        $partitions->ensureDefaultPartitions();
        $this->info("Crawler partitions ensured through {$months} future months.");

        return self::SUCCESS;
    }
}
