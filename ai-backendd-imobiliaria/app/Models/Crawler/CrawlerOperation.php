<?php

namespace App\Models\Crawler;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class CrawlerOperation extends Model
{
    protected $table = 'crawler.operations';

    protected $fillable = [
        'type',
        'state',
        'requested_by',
        'crawl_agency_id',
        'market_data_contract_version_id',
        'plan',
        'retry_of_operation_id',
        'equivalence_key',
    ];

    protected function casts(): array
    {
        return [
            'plan' => 'array',
            'result' => 'array',
            'heartbeat_at' => 'datetime',
            'lease_expires_at' => 'datetime',
            'claimed_at' => 'datetime',
            'completed_at' => 'datetime',
            'cancellation_requested_at' => 'datetime',
            'timed_out_at' => 'datetime',
        ];
    }

    public function crawlAgency(): BelongsTo
    {
        return $this->belongsTo(CrawlAgency::class);
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(MarketDataContractVersion::class, 'market_data_contract_version_id');
    }

    public function discoverySnapshot(): HasOne
    {
        return $this->hasOne(DiscoverySnapshot::class, 'operation_id');
    }

    public function groups(): BelongsToMany
    {
        return $this->belongsToMany(
            OperationGroup::class,
            'crawler.operation_group_members',
            'operation_id',
            'operation_group_id',
        )->withPivot('created_at');
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(WorkerInstance::class, 'worker_instance_id');
    }
}
