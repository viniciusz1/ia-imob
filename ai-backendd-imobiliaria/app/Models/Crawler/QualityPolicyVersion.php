<?php

namespace App\Models\Crawler;

use Illuminate\Database\Eloquent\Model;

class QualityPolicyVersion extends Model
{
    protected $table = 'crawler.quality_policy_versions';

    protected $fillable = ['version', 'status', 'rules', 'created_by', 'activated_by', 'activated_at'];

    protected function casts(): array
    {
        return ['rules' => 'array', 'activated_at' => 'datetime'];
    }

    protected static function booted(): void
    {
        static::updating(function (self $policy): void {
            if ($policy->getOriginal('status') === 'active') {
                throw new \LogicException('Active quality policies are immutable.');
            }
        });
        static::deleting(function (self $policy): void {
            if ($policy->status === 'active') {
                throw new \LogicException('Active quality policies cannot be deleted.');
            }
        });
    }
}
