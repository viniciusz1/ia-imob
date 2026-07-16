<?php

namespace App\Services\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\MarketDataContractVersion;
use App\Models\Crawler\QualityGateReport;
use App\Models\Crawler\QualityPolicyVersion;
use App\Models\CrawlerRun;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CrawlRunPublicationService
{
    public function __construct(private readonly ListingInventoryService $inventory) {}

    public function evaluate(CrawlerRun $run): QualityGateReport
    {
        return DB::transaction(function () use ($run): QualityGateReport {
            $lockedRun = CrawlerRun::query()->lockForUpdate()->findOrFail($run->id);
            $existing = QualityGateReport::query()->where('crawl_run_id', $lockedRun->id)->first();
            if ($existing !== null) {
                return $existing;
            }
            if ($lockedRun->publication_state !== 'candidate') {
                throw ValidationException::withMessages(['publication_state' => 'Only candidate snapshots can be evaluated.']);
            }

            $agency = CrawlAgency::query()->lockForUpdate()->findOrFail($lockedRun->crawl_agency_id);
            $discovered = (int) DB::table('crawler.discovery_snapshots')
                ->where('id', $lockedRun->discovery_snapshot_id)
                ->value('url_count');
            $activeContractId = MarketDataContractVersion::query()->where('status', 'active')->value('id');
            $blockers = [];
            $warnings = [];
            if ($lockedRun->technical_state !== 'succeeded' || $lockedRun->result_kind !== 'full') {
                $blockers[] = 'technical_result_not_publishable';
            }
            if ($discovered === 0) {
                $blockers[] = 'empty_discovery';
            }
            if ($lockedRun->normalized_count === 0) {
                $blockers[] = 'zero_valid_records';
            }
            if ($activeContractId === null || (int) $activeContractId !== (int) $lockedRun->market_data_contract_version_id) {
                $blockers[] = 'contract_not_current';
            }
            if ($agency->revalidation_required) {
                $blockers[] = 'agency_revalidation_required';
            }

            $policy = QualityPolicyVersion::query()->findOrFail($lockedRun->quality_policy_version_id);
            $rules = $policy->rules;
            $baselineRuns = CrawlerRun::query()
                ->where('crawl_agency_id', $agency->id)
                ->where('publication_state', 'published')
                ->oldest('id')
                ->limit(3)
                ->get();
            $baselineAverage = $baselineRuns->count() === 3
                ? (float) $baselineRuns->avg('normalized_count')
                : null;
            $errorRatio = $lockedRun->error_count / max(1, $lockedRun->raw_count);
            $rejectionRatio = $lockedRun->rejected_count / max(1, $lockedRun->raw_count);
            $stockDropRatio = $baselineAverage === null || $baselineAverage <= 0
                ? 0.0
                : max(0.0, 1 - ($lockedRun->normalized_count / $baselineAverage));
            $maximumStockDrop = (float) ($rules['maximum_stock_drop_ratio'] ?? 0.5);
            $maximumErrorRatio = (float) ($rules['maximum_error_ratio'] ?? 0.3);
            $maximumRejectionRatio = (float) ($rules['maximum_rejection_ratio'] ?? 0.3);
            if ($baselineAverage !== null && $stockDropRatio > $maximumStockDrop) {
                $blockers[] = 'stock_drop_above_threshold';
            } elseif ($baselineAverage !== null && $stockDropRatio > 0) {
                $warnings[] = 'stock_drop_warning';
            }
            if ($errorRatio > $maximumErrorRatio) {
                $blockers[] = 'crawl_error_ratio_above_threshold';
            } elseif ($errorRatio > 0) {
                $warnings[] = 'crawl_error_ratio_warning';
            }
            if ($rejectionRatio > $maximumRejectionRatio) {
                $blockers[] = 'rejection_ratio_above_threshold';
            } elseif ($rejectionRatio > 0) {
                $warnings[] = 'rejection_ratio_warning';
            }

            $report = QualityGateReport::query()->create([
                'crawl_run_id' => $lockedRun->id,
                'market_data_contract_version_id' => $lockedRun->market_data_contract_version_id,
                'quality_policy_version_id' => $lockedRun->quality_policy_version_id,
                'verdict' => $blockers === [] ? 'approved' : 'blocked',
                'blockers' => $blockers,
                'warnings' => $warnings,
                'evidence' => [
                    'discovered' => $discovered,
                    'raw' => $lockedRun->raw_count,
                    'normalized' => $lockedRun->normalized_count,
                    'rejected' => $lockedRun->rejected_count,
                    'errors' => $lockedRun->error_count,
                    'baseline' => [
                        'published_snapshot_count' => $baselineRuns->count(),
                        'normalized_average' => $baselineAverage,
                    ],
                    'ratios' => [
                        'stock_drop' => $stockDropRatio,
                        'errors' => $errorRatio,
                        'rejections' => $rejectionRatio,
                    ],
                ],
                'evaluated_at' => now(),
            ]);

            if ($blockers !== []) {
                $lockedRun->update([
                    'publication_state' => 'quarantined',
                    'publishable' => false,
                    'quarantined_at' => now(),
                ]);

                return $report;
            }

            $lockedRun->update([
                'publication_state' => 'published',
                'publishable' => true,
                'published_at' => now(),
            ]);
            $this->inventory->applyPublishedSnapshot($lockedRun);
            $agency->update(['current_published_crawl_run_id' => $lockedRun->id]);

            return $report;
        });
    }
}
