<?php

namespace App\Models\Crawler;

use Illuminate\Database\Eloquent\Model;

class WorkerInstance extends Model
{
    protected $table = 'crawler.worker_instances';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'capacity' => 'array',
            'last_heartbeat_at' => 'datetime',
        ];
    }
}
