<?php

namespace App\Services\Crawler;

use App\Models\Crawler\CrawlerOperation;

class CrawlerOperationMaintenanceService
{
    public function failExpiredLeases(): int
    {
        return CrawlerOperation::query()
            ->whereIn('state', ['running', 'cancellation_requested'])
            ->whereNotNull('lease_expires_at')
            ->where('lease_expires_at', '<', now())
            ->update([
                'state' => 'failed',
                'stage' => 'timed_out',
                'error_code' => 'worker_timeout',
                'error_message' => 'Worker heartbeat lease expired.',
                'timed_out_at' => now(),
                'completed_at' => now(),
                'lease_expires_at' => null,
                'updated_at' => now(),
            ]);
    }
}
