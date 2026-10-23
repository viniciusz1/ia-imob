<?php

namespace App\Console\Commands;

use App\Services\Auction\AuctionLifecycleService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class ExpireFinishedAuctionsCommand extends Command
{
    protected $signature = 'auctions:expire-finished {--as-of= : Optional datetime to evaluate expiration as of (ISO-8601 or Y-m-d H:i:s)}';

    protected $description = 'Expire finished auction rounds, event properties, and closed auction events';

    public function handle(AuctionLifecycleService $lifecycleService): int
    {
        $asOf = $this->option('as-of')
            ? Carbon::parse($this->option('as-of'))
            : Carbon::now();

        $this->info("Checking finished auctions as of {$asOf->toIso8601String()}...");

        $results = $lifecycleService->expireFinishedAuctions($asOf);

        $this->info("Expired {$results['expired_rounds']} auction rounds.");
        $this->info("Expired {$results['expired_properties']} event properties.");
        $this->info("Closed {$results['closed_events']} auction events.");

        return self::SUCCESS;
    }
}
