<?php

namespace App\Services\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\DiscoverySnapshot;
use App\Models\Crawler\ExtractionProfile;
use App\Models\Crawler\QualityPolicyVersion;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProductionCrawlService
{
    public function queue(array $input, User $requester): CrawlerOperation
    {
        $agency = CrawlAgency::query()->findOrFail($input['crawl_agency_id']);
        $errors = [];
        if ($agency->lifecycle_state !== 'active' || $agency->revalidation_required) {
            $errors['crawl_agency_id'] = 'The Crawl Agency must be active and fully validated.';
        }

        $profile = isset($input['extraction_profile_id'])
            ? ExtractionProfile::query()->find($input['extraction_profile_id'])
            : ExtractionProfile::query()
                ->where('crawl_agency_id', $agency->id)
                ->where('status', 'active')
                ->first();
        if ($profile === null
            || $profile->crawl_agency_id !== $agency->id
            || ! in_array($profile->status, ['active', 'approved'], true)) {
            $errors['extraction_profile_id'] = 'Choose an active or approved profile from this Crawl Agency.';
        }

        $snapshot = null;
        if ($input['discovery_mode'] === 'existing') {
            $snapshot = DiscoverySnapshot::query()->find($input['discovery_snapshot_id'] ?? null);
            if ($snapshot === null || $snapshot->crawl_agency_id !== $agency->id) {
                $errors['discovery_snapshot_id'] = 'Choose a Discovery Snapshot from this Crawl Agency.';
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        $contract = $profile->contract()->firstOrFail();
        if ($contract->status !== 'active') {
            throw ValidationException::withMessages([
                'extraction_profile_id' => 'The selected profile does not target the active Market Data Contract.',
            ]);
        }
        $policy = QualityPolicyVersion::query()->where('status', 'active')->latest('version')->firstOrFail();
        $discovery = $snapshot === null
            ? ['mode' => 'fresh', 'base_url' => $agency->base_url]
            : [
                'mode' => 'existing',
                'snapshot_id' => $snapshot->id,
                'urls' => $snapshot->urls()->orderBy('id')->pluck('url')->all(),
            ];

        $plan = [
            'version' => 1,
            'type' => 'production_crawl',
            'crawl_agency_id' => $agency->id,
            'discovery' => $discovery,
            'extraction_profile' => [
                'id' => $profile->id,
                'version' => $profile->version,
                'schemas' => $profile->schemas,
                'strategies' => $profile->strategies,
                'fields' => $profile->fields,
                'parameters' => $profile->parameters,
            ],
            'market_data_contract' => [
                'id' => $contract->id,
                'version' => $contract->version,
                'fields' => $contract->fields,
            ],
            'quality_policy' => [
                'id' => $policy->id,
                'version' => $policy->version,
                'rules' => $policy->rules,
            ],
        ];
        $equivalenceKey = hash('sha256', json_encode($plan, JSON_THROW_ON_ERROR));

        return DB::transaction(function () use ($agency, $contract, $equivalenceKey, $plan, $requester): CrawlerOperation {
            DB::statement('SELECT pg_advisory_xact_lock(?)', [$agency->id]);
            $pending = CrawlerOperation::query()
                ->where('type', 'production_crawl')
                ->where('state', 'queued')
                ->where('crawl_agency_id', $agency->id)
                ->where('equivalence_key', $equivalenceKey)
                ->first();
            if ($pending !== null) {
                return $pending;
            }

            return CrawlerOperation::query()->create([
                'type' => 'production_crawl',
                'state' => 'queued',
                'requested_by' => $requester->id,
                'crawl_agency_id' => $agency->id,
                'market_data_contract_version_id' => $contract->id,
                'equivalence_key' => $equivalenceKey,
                'plan' => $plan,
            ])->refresh();
        });
    }
}
