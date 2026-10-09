<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\Auction\AuctionCrawlRunStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuctionCrawlRun extends Model
{
    public const MAX_LOG_LINES = 400;

    protected $fillable = [
        'auction_crawler_source_id',
        'triggered_by',
        'status',
        'stage',
        'worker_key',
        'sitemaps_read',
        'urls_found',
        'urls_total',
        'processed',
        'ingested',
        'failed',
        'log',
        'error',
        'started_at',
        'heartbeat_at',
        'cancel_requested_at',
        'finished_at',
    ];

    protected $attributes = [
        'log' => '[]',
    ];

    protected $casts = [
        'status' => AuctionCrawlRunStatus::class,
        'log' => 'array',
        'sitemaps_read' => 'integer',
        'urls_found' => 'integer',
        'urls_total' => 'integer',
        'processed' => 'integer',
        'ingested' => 'integer',
        'failed' => 'integer',
        'started_at' => 'datetime',
        'heartbeat_at' => 'datetime',
        'cancel_requested_at' => 'datetime',
        'finished_at' => 'datetime',
    ];

    public function source(): BelongsTo
    {
        return $this->belongsTo(AuctionCrawlerSource::class, 'auction_crawler_source_id');
    }

    public function triggeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'triggered_by');
    }

    /**
     * Appends log lines keeping only the most recent MAX_LOG_LINES entries.
     *
     * @param  list<array{at?: string, level?: string, message: string}>  $lines
     */
    public function appendLog(array $lines): void
    {
        if ($lines === []) {
            return;
        }

        $normalized = array_map(static fn (array $line): array => [
            'at' => $line['at'] ?? now()->toIso8601String(),
            'level' => $line['level'] ?? 'info',
            'message' => mb_substr((string) $line['message'], 0, 1000),
        ], $lines);

        $this->log = array_slice([...($this->log ?? []), ...$normalized], -self::MAX_LOG_LINES);
    }

    public function progressPercentage(): int
    {
        if ($this->status === AuctionCrawlRunStatus::Succeeded) {
            return 100;
        }

        if ($this->urls_total <= 0) {
            return 0;
        }

        return (int) min(99, floor(($this->processed / $this->urls_total) * 100));
    }
}
