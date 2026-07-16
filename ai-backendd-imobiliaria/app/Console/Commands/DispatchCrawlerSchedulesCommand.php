<?php

namespace App\Console\Commands;

use App\Services\Crawler\CrawlerScheduleDispatcher;
use Illuminate\Console\Command;

class DispatchCrawlerSchedulesCommand extends Command
{
    protected $signature = 'crawler:dispatch-schedules';

    protected $description = 'Queue crawler operations whose schedules are due';

    public function handle(CrawlerScheduleDispatcher $dispatcher): int
    {
        $this->info(sprintf('%d crawler schedule(s) dispatched.', $dispatcher->dispatchDue()));

        return self::SUCCESS;
    }
}
