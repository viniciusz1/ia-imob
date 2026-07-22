<?php

namespace App\Console\Commands;

use App\Services\Crawler\CrawlerOperationMaintenanceService;
use Illuminate\Console\Command;

class ExpireCrawlerOperationLeasesCommand extends Command
{
    protected $signature = 'crawler:expire-operation-leases';

    protected $description = 'Fail crawler operations whose worker lease expired';

    public function handle(CrawlerOperationMaintenanceService $maintenance): int
    {
        $this->info("Expired {$maintenance->failExpiredLeases()} crawler operation leases.");

        return self::SUCCESS;
    }
}
