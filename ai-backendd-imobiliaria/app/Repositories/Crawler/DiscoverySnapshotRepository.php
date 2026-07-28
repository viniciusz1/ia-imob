<?php

namespace App\Repositories\Crawler;

use App\Models\Crawler\DiscoverySnapshot;
use App\Models\Crawler\DiscoverySnapshotUrl;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class DiscoverySnapshotRepository
{
    public function __construct(
        protected DiscoverySnapshot $snapshot,
        protected DiscoverySnapshotUrl $snapshotUrl,
    ) {}

    /**
     * @return Collection<int, DiscoverySnapshot>
     */
    public function listForAgency(int $crawlAgencyId): Collection
    {
        return $this->snapshot->newQuery()
            ->where('crawl_agency_id', $crawlAgencyId)
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * @return LengthAwarePaginator<DiscoverySnapshotUrl>
     */
    public function paginateUrls(int $discoverySnapshotId, int $perPage): LengthAwarePaginator
    {
        return $this->snapshotUrl->newQuery()
            ->where('discovery_snapshot_id', $discoverySnapshotId)
            ->orderBy('id')
            ->paginate($perPage);
    }
}
