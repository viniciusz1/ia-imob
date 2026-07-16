<?php

namespace App\Models\Crawler;

use Illuminate\Database\Eloquent\Model;

class OnboardingPlan extends Model
{
    protected $table = 'crawler.onboarding_plans';

    protected $fillable = ['prospect_id', 'crawl_agency_id', 'status', 'steps', 'created_by'];

    protected function casts(): array
    {
        return ['steps' => 'array'];
    }
}
