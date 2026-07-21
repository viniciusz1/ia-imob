<?php

namespace App\Services\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\DiscoverySnapshot;
use App\Models\Crawler\MarketDataContractVersion;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CrawlerOperationService
{
    public function queueDiscovery(
        CrawlAgency $agency,
        MarketDataContractVersion $contract,
        User $requester,
        ?array $discoveryPolicy = null,
    ): CrawlerOperation {
        $plan = [
            'version' => 1,
            'type' => 'discovery',
            'crawl_agency_id' => $agency->id,
            'base_url' => $agency->base_url,
            'root_domain' => $agency->root_domain,
            'market_data_contract_version_id' => $contract->id,
        ];

        if ($discoveryPolicy !== null) {
            $plan['discovery_policy'] = $discoveryPolicy;
        }

        return CrawlerOperation::query()->create([
            'type' => 'discovery',
            'state' => 'queued',
            'requested_by' => $requester->id,
            'crawl_agency_id' => $agency->id,
            'market_data_contract_version_id' => $contract->id,
            'plan' => $plan,
        ])->refresh();
    }

    public function queueSampleUrlSuggestion(CrawlAgency $agency, User $requester): CrawlerOperation
    {
        return $this->queueEquivalent(
            type: 'sample_url_suggestion',
            agencyId: $agency->id,
            contractId: null,
            plan: [
                'version' => 1,
                'type' => 'sample_url_suggestion',
                'crawl_agency_id' => $agency->id,
                'base_url' => $agency->base_url,
            ],
            requester: $requester,
        );
    }

    public function queueProfileGeneration(
        CrawlAgency $agency,
        DiscoverySnapshot $snapshot,
        MarketDataContractVersion $contract,
        string $sampleUrl,
        User $requester,
    ): CrawlerOperation {
        if ($snapshot->crawl_agency_id !== $agency->id) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'discovery_snapshot_id' => 'The discovery snapshot belongs to another Crawl Agency.',
            ]);
        }

        return $this->queueEquivalent(
            type: 'profile_generation',
            agencyId: $agency->id,
            contractId: $contract->id,
            plan: [
                'version' => 1,
                'type' => 'profile_generation',
                'crawl_agency_id' => $agency->id,
                'discovery_snapshot_id' => $snapshot->id,
                'sample_url' => $sampleUrl,
                'sample_url_confirmed' => true,
                'market_data_contract_version_id' => $contract->id,
                'contract_fields' => $contract->fields,
            ],
            requester: $requester,
        );
    }

    public function queueEquivalent(
        string $type,
        int $agencyId,
        ?int $contractId,
        array $plan,
        User $requester,
    ): CrawlerOperation {
        $equivalenceKey = hash('sha256', json_encode($plan, JSON_THROW_ON_ERROR));

        return DB::transaction(function () use ($agencyId, $contractId, $equivalenceKey, $plan, $requester, $type): CrawlerOperation {
            DB::statement('SELECT pg_advisory_xact_lock(?)', [$agencyId]);
            $existing = CrawlerOperation::query()
                ->where('type', $type)
                ->where('crawl_agency_id', $agencyId)
                ->where('equivalence_key', $equivalenceKey)
                ->whereIn('state', ['queued', 'running', 'cancellation_requested'])
                ->first();

            if ($existing !== null) {
                return $existing;
            }

            return CrawlerOperation::query()->create([
                'type' => $type,
                'state' => 'queued',
                'requested_by' => $requester->id,
                'crawl_agency_id' => $agencyId,
                'market_data_contract_version_id' => $contractId,
                'equivalence_key' => $equivalenceKey,
                'plan' => $plan,
            ])->refresh();
        });
    }
}
