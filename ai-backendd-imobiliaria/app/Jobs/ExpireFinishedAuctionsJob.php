<?php

namespace App\Jobs;

use App\Services\Auction\AuctionLifecycleService;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ExpireFinishedAuctionsJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public ?string $asOfIsoString = null
    ) {}

    public function handle(AuctionLifecycleService $lifecycleService): void
    {
        $asOf = $this->asOfIsoString ? Carbon::parse($this->asOfIsoString) : null;
        $lifecycleService->expireFinishedAuctions($asOf);
    }
}
