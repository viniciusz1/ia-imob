<?php

namespace App\Services\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\DiscoverySnapshot;
use App\Models\Crawler\MarketDataContractVersion;
use App\Models\User;

class CrawlerOperationService
{
    public function queueDiscovery(
        CrawlAgency $agency,
        MarketDataContractVersion $contract,
        User $requester,
    ): CrawlerOperation {
        return CrawlerOperation::query()->create([
            'type' => 'discovery',
            'state' => 'queued',
            'requested_by' => $requester->id,
            'crawl_agency_id' => $agency->id,
            'market_data_contract_version_id' => $contract->id,
            'plan' => [
                'version' => 1,
                'type' => 'discovery',
                'crawl_agency_id' => $agency->id,
                'base_url' => $agency->base_url,
                'root_domain' => $agency->root_domain,
                'market_data_contract_version_id' => $contract->id,
            ],
        ])->refresh();
    }

    public function queueSampleUrlSuggestion(CrawlAgency $agency, User $requester): CrawlerOperation
    {
        return CrawlerOperation::query()->create([
            'type' => 'sample_url_suggestion',
            'state' => 'queued',
            'requested_by' => $requester->id,
            'crawl_agency_id' => $agency->id,
            'plan' => [
                'version' => 1,
                'type' => 'sample_url_suggestion',
                'crawl_agency_id' => $agency->id,
                'base_url' => $agency->base_url,
            ],
        ])->refresh();
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

        return CrawlerOperation::query()->create([
            'type' => 'profile_generation',
            'state' => 'queued',
            'requested_by' => $requester->id,
            'crawl_agency_id' => $agency->id,
            'market_data_contract_version_id' => $contract->id,
            'plan' => [
                'version' => 1,
                'type' => 'profile_generation',
                'crawl_agency_id' => $agency->id,
                'discovery_snapshot_id' => $snapshot->id,
                'sample_url' => $sampleUrl,
                'sample_url_confirmed' => true,
                'market_data_contract_version_id' => $contract->id,
                'contract_fields' => $contract->fields,
            ],
        ])->refresh();
    }
}
