<?php

namespace App\Services\Crawler;

use App\Models\Crawler\CrawlerOperation;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

/**
 * Reads the operation queue in the order the worker claims it. Keep in sync with
 * PostgresOperationStore::claim in crawler-machine: queued operations are claimed
 * oldest first (created_at, id), and a production crawl is skipped while another
 * production crawl of the same Crawl Agency is still active.
 */
class CrawlerOperationQueueReader
{
    private const RELATIONS = ['discoverySnapshot', 'crawlAgency', 'groups', 'requester', 'worker'];

    private const ACTIVE_STATES = ['running', 'cancellation_requested'];

    /**
     * @return Collection<int, CrawlerOperation>
     */
    public function running(): Collection
    {
        return CrawlerOperation::query()
            ->with(self::RELATIONS)
            ->whereIn('state', self::ACTIVE_STATES)
            ->orderBy('claimed_at')
            ->orderBy('id')
            ->get();
    }

    /**
     * Each queued operation carries its absolute `queue_position` and, when the
     * worker will skip it for now, the `blocked_by_operation_id` holding it back.
     */
    public function queued(int $perPage): LengthAwarePaginator
    {
        $page = CrawlerOperation::query()
            ->with(self::RELATIONS)
            ->where('state', 'queued')
            ->orderBy('created_at')
            ->orderBy('id')
            ->paginate($perPage);
        $activeProductionCrawls = CrawlerOperation::query()
            ->where('type', 'production_crawl')
            ->whereIn('state', self::ACTIVE_STATES)
            ->whereIn('crawl_agency_id', $page->getCollection()->where('type', 'production_crawl')->pluck('crawl_agency_id')->filter()->unique())
            ->pluck('id', 'crawl_agency_id');
        $offset = ($page->currentPage() - 1) * $page->perPage();

        $page->getCollection()->values()->each(function (CrawlerOperation $operation, int $index) use ($activeProductionCrawls, $offset): void {
            $operation->setAttribute('queue_position', $offset + $index + 1);
            $operation->setAttribute(
                'blocked_by_operation_id',
                $operation->type === 'production_crawl' ? $activeProductionCrawls->get($operation->crawl_agency_id) : null,
            );
        });

        return $page;
    }
}
