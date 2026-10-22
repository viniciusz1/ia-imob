<?php

namespace App\Models\Crawler;

use App\Models\CrawlerRun;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;

class CrawlAgency extends Model
{
    use HasFactory;

    protected $table = 'crawler.crawl_agencies';

    protected $fillable = [
        'name',
        'slug',
        'base_url',
        'root_domain',
        'lifecycle_state',
        'health_state',
        'revalidation_required',
        'current_published_crawl_run_id',
        'active_discovery_policy_version_id',
    ];

    protected function casts(): array
    {
        return [
            'revalidation_required' => 'boolean',
        ];
    }

    public function activeDiscoveryPolicy(): BelongsTo
    {
        return $this->belongsTo(
            DiscoveryPolicyVersion::class,
            'active_discovery_policy_version_id',
        );
    }

    public function getLastCrawledAtAttribute(): ?Carbon
    {
        if (array_key_exists('last_crawled_at', $this->attributes)) {
            $value = $this->attributes['last_crawled_at'];

            return $value ? Carbon::parse($value) : null;
        }

        $lastRunDate = CrawlerRun::query()
            ->where('crawl_agency_id', $this->id)
            ->max(DB::raw('COALESCE(completed_at, started_at, created_at)'));

        $lastOpDate = CrawlerOperation::query()
            ->where('crawl_agency_id', $this->id)
            ->whereIn('type', ['production_crawl', 'profile_validation'])
            ->max(DB::raw('COALESCE(completed_at, claimed_at, created_at)'));

        $candidates = array_filter([$lastRunDate, $lastOpDate]);
        if (empty($candidates)) {
            return null;
        }

        return Carbon::parse(max($candidates));
    }
}
