<?php

namespace App\Models\Crawler;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class OperationGroup extends Model
{
    protected $table = 'crawler.operation_groups';

    protected $guarded = ['id'];

    public function operations(): BelongsToMany
    {
        return $this->belongsToMany(
            CrawlerOperation::class,
            'crawler.operation_group_members',
            'operation_group_id',
            'operation_id',
        )->withPivot('created_at');
    }
}
