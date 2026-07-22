<?php

namespace App\Models\Crawler;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DiscoverySnapshot extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'crawler.discovery_snapshots';

    protected $guarded = ['id'];

    public function urls(): HasMany
    {
        return $this->hasMany(DiscoverySnapshotUrl::class);
    }
}
