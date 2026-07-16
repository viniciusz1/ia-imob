<?php

namespace App\Services\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\CrawlerOperation;
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
}
