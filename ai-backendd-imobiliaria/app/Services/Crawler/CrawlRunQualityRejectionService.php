<?php

namespace App\Services\Crawler;

use App\Models\Crawler\CrawlRunQualityRejection;
use App\Models\Crawler\QualityGateReport;
use App\Models\CrawlerRun;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CrawlRunQualityRejectionService
{
    public function reject(CrawlerRun $run, User $user, string $reason): CrawlerRun
    {
        return DB::transaction(function () use ($reason, $run, $user): CrawlerRun {
            $lockedRun = CrawlerRun::query()->lockForUpdate()->findOrFail($run->id);
            if ($lockedRun->publication_state !== 'quarantined') {
                throw ValidationException::withMessages([
                    'publication_state' => 'Only quarantined snapshots can be rejected.',
                ]);
            }
            if ($lockedRun->qualityRejection()->exists()) {
                throw ValidationException::withMessages([
                    'quality_rejection' => 'This snapshot already has a rejection decision.',
                ]);
            }

            $report = QualityGateReport::query()->where('crawl_run_id', $lockedRun->id)->firstOrFail();
            CrawlRunQualityRejection::query()->create([
                'crawl_run_id' => $lockedRun->id,
                'quality_gate_report_id' => $report->id,
                'rejected_by' => $user->id,
                'reason' => $reason,
                'rejected_at' => now(),
            ]);

            return $lockedRun->load(['qualityReport', 'exceptionalPublication', 'qualityRejection']);
        });
    }
}
