<?php

namespace App\Models\Crawler;

use Illuminate\Database\Eloquent\Model;

class ScheduleDefault extends Model
{
    protected $table = 'crawler.schedule_defaults';

    protected $fillable = ['preset', 'timezone', 'updated_by'];
}
