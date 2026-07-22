<?php

namespace App\Services\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\ExceptionalPublication;
use App\Models\Crawler\QualityGateReport;
use App\Models\CrawlerRun;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ExceptionalPublicationService
{
    private const NON_OVERRIDABLE_BLOCKERS = [
        'empty_discovery',
        'zero_valid_records',
        'contract_not_current',
        'agency_revalidation_required',
        'technical_result_not_publishable',
    ];

    public function __construct(private readonly ListingInventoryService $inventory) {}

    public function publish(CrawlerRun $run, User $user, string $reason): CrawlerRun
    {
        return DB::transaction(function () use ($reason, $run, $user): CrawlerRun {
            $lockedRun = CrawlerRun::query()->lockForUpdate()->findOrFail($run->id);
            if ($lockedRun->publication_state !== 'quarantined') {
                throw ValidationException::withMessages(['publication_state' => 'Only quarantined snapshots can be exceptionally published.']);
            }
            $agency = CrawlAgency::query()->lockForUpdate()->findOrFail($lockedRun->crawl_agency_id);
            if ($agency->lifecycle_state !== 'active') {
                throw ValidationException::withMessages(['crawl_agency_id' => 'Exceptional publication requires an active Crawl Agency.']);
            }
            $report = QualityGateReport::query()->where('crawl_run_id', $lockedRun->id)->firstOrFail();
            if (array_intersect(self::NON_OVERRIDABLE_BLOCKERS, $report->blockers) !== []) {
                throw ValidationException::withMessages(['blockers' => 'Onboarding and technical blockers cannot be overridden.']);
            }

            ExceptionalPublication::query()->create([
                'crawl_run_id' => $lockedRun->id,
                'quality_gate_report_id' => $report->id,
                'published_by' => $user->id,
                'reason' => $reason,
                'published_at' => now(),
            ]);
            $lockedRun->update(['publication_state' => 'published', 'publishable' => true, 'published_at' => now()]);
            $this->inventory->applyPublishedSnapshot($lockedRun);
            $agency->update(['current_published_crawl_run_id' => $lockedRun->id]);

            return $lockedRun->load(['qualityReport', 'exceptionalPublication']);
        });
    }
}
