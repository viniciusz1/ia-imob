<?php

namespace App\Models\Crawler;

use Illuminate\Database\Eloquent\Model;

class DiscoverySnapshotUrl extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'crawler.discovery_snapshot_urls';

    protected $guarded = ['id'];
}
