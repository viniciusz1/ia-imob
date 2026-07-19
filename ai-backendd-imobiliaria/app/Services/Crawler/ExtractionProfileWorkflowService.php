<?php

namespace App\Services\Crawler;

use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\ExtractionProfile;
use App\Models\Crawler\ProfileValidationReport;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ExtractionProfileWorkflowService
{
    public function __construct(
        private readonly DistributedSnapshotSampler $sampler,
        private readonly CrawlerOperationService $operations,
    ) {}

    public function queueValidation(ExtractionProfile $profile, User $requester): CrawlerOperation
    {
        if (! in_array($profile->status, ['candidate', 'revalidation_required'], true)) {
            throw ValidationException::withMessages(['status' => 'Only candidate profiles can be validated.']);
        }

        $snapshot = $profile->discoverySnapshot()->firstOrFail();
        $urls = $snapshot->urls()->orderBy('id')->pluck('url')->all();
        $sample = $this->sampler->sample($urls);

        if ($sample === []) {
            throw ValidationException::withMessages(['discovery_snapshot_id' => 'The Discovery Snapshot has no URLs.']);
        }

        return $this->operations->queueEquivalent(
            type: 'profile_validation',
            agencyId: $profile->crawl_agency_id,
            contractId: $profile->market_data_contract_version_id,
            plan: [
                'version' => 1,
                'type' => 'profile_validation',
                'crawl_agency_id' => $profile->crawl_agency_id,
                'extraction_profile_id' => $profile->id,
                'discovery_snapshot_id' => $profile->discovery_snapshot_id,
                'market_data_contract_version_id' => $profile->market_data_contract_version_id,
                'urls' => $sample,
                'schemas' => $profile->schemas,
                'fields' => $profile->fields,
                'thresholds' => [
                    'valid_ratio' => 0.80,
                    'required_field_coverage' => 0.90,
                ],
            ],
            requester: $requester,
        );
    }

    public function decide(ExtractionProfile $profile, string $decision, string $reason, User $actor): ExtractionProfile
    {
        if (! in_array($profile->status, ['candidate', 'revalidation_required'], true)) {
            throw ValidationException::withMessages(['status' => 'Only a pending profile can be decided.']);
        }

        $report = ProfileValidationReport::query()
            ->where('extraction_profile_id', $profile->id)
            ->latest('id')
            ->first();

        if ($decision === 'approved' && $report === null) {
            throw ValidationException::withMessages(['decision' => 'A validation report is required before approval.']);
        }

        $profile->update([
            'status' => $decision,
            'decided_by' => $actor->id,
            'decided_at' => now(),
            'decision_reason' => $reason,
        ]);

        return $profile->refresh();
    }

    public function activate(ExtractionProfile $profile, User $actor): ExtractionProfile
    {
        if ($profile->status !== 'approved') {
            throw ValidationException::withMessages(['status' => 'Only an approved profile can be activated.']);
        }

        if ($profile->market_data_contract_version_id !== $profile->contract()->where('status', 'active')->value('id')) {
            throw ValidationException::withMessages(['market_data_contract_version_id' => 'The profile contract is no longer active.']);
        }

        return DB::transaction(function () use ($profile, $actor): ExtractionProfile {
            DB::statement('SELECT pg_advisory_xact_lock(?)', [$profile->crawl_agency_id]);
            ExtractionProfile::query()
                ->where('crawl_agency_id', $profile->crawl_agency_id)
                ->where('status', 'active')
                ->update(['status' => 'approved']);
            $profile->update([
                'status' => 'active',
                'activated_by' => $actor->id,
                'activated_at' => now(),
            ]);
            $profile->crawlAgency()->update(['revalidation_required' => false]);

            return $profile->refresh();
        });
    }
}
