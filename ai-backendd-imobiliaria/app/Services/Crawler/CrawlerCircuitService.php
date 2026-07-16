<?php

namespace App\Services\Crawler;

use App\Models\Crawler\CrawlAgencyCircuit;
use App\Models\Crawler\CrawlAgencySchedule;
use App\Models\Crawler\CrawlerOperation;

class CrawlerCircuitService
{
    public function update(): int
    {
        $processed = 0;
        CrawlerOperation::query()->where('type', 'production_crawl')
            ->whereIn('state', ['succeeded', 'failed'])
            ->whereNotNull('crawl_agency_id')
            ->orderBy('id')
            ->each(function (CrawlerOperation $operation) use (&$processed): void {
                $circuit = CrawlAgencyCircuit::query()->firstOrCreate(
                    ['crawl_agency_id' => $operation->crawl_agency_id],
                    ['state' => 'closed', 'consecutive_failures' => 0],
                );
                if ($operation->id <= (int) ($circuit->last_evaluated_operation_id ?? 0)) {
                    return;
                }
                if ($operation->state === 'succeeded') {
                    $circuit->update([
                        'state' => 'closed',
                        'consecutive_failures' => 0,
                        'closed_at' => now(),
                        'reason' => null,
                        'last_evaluated_operation_id' => $operation->id,
                    ]);
                    CrawlAgencySchedule::query()->where('crawl_agency_id', $operation->crawl_agency_id)
                        ->update(['suspended_at' => null, 'suspension_reason' => null]);
                } else {
                    $failures = $circuit->consecutive_failures + 1;
                    $open = $failures >= 3;
                    $circuit->update([
                        'state' => $open ? 'open' : 'closed',
                        'consecutive_failures' => $failures,
                        'opened_at' => $open ? now() : $circuit->opened_at,
                        'reason' => $open ? 'three_consecutive_production_failures' : null,
                        'last_evaluated_operation_id' => $operation->id,
                    ]);
                    if ($open) {
                        CrawlAgencySchedule::query()->where('crawl_agency_id', $operation->crawl_agency_id)
                            ->update(['suspended_at' => now(), 'suspension_reason' => 'three_consecutive_production_failures']);
                    }
                }
                $processed++;
            });

        return $processed;
    }
}
