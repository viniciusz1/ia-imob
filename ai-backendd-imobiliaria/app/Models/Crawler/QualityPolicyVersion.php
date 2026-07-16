<?php

namespace App\Models\Crawler;

use Illuminate\Database\Eloquent\Model;

class QualityPolicyVersion extends Model
{
    protected $table = 'crawler.quality_policy_versions';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['rules' => 'array'];
    }
}
