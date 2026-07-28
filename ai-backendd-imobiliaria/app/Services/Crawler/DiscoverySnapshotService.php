<?php

namespace App\Services\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\DiscoverySnapshot;
use App\Models\Crawler\DiscoverySnapshotUrl;
use App\Repositories\Crawler\DiscoverySnapshotRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class DiscoverySnapshotService
{
    public function __construct(protected DiscoverySnapshotRepository $repository) {}

    /**
     * @return Collection<int, DiscoverySnapshot>
     */
    public function listForAgency(CrawlAgency $crawlAgency): Collection
    {
        return $this->repository->listForAgency($crawlAgency->id);
    }

    /**
     * @return LengthAwarePaginator<DiscoverySnapshotUrl>
     */
    public function paginateUrls(DiscoverySnapshot $discoverySnapshot, int $perPage): LengthAwarePaginator
    {
        return $this->repository->paginateUrls($discoverySnapshot->id, $perPage);
    }
}
