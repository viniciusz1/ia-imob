<?php

namespace App\Models\Crawler;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use LogicException;

class DiscoveryPolicyVersion extends Model
{
    protected $table = 'crawler.discovery_policy_versions';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'strategies' => 'array',
            'configuration' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::updating(function (self $version): void {
            if ($version->getOriginal('status') === 'draft') {
                return;
            }

            $contentChanges = array_diff(
                array_keys($version->getDirty()),
                ['status', 'updated_at'],
            );
            if ($contentChanges !== []) {
                throw new LogicException('Available or archived Discovery Policy versions are immutable.');
            }
        });
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function executionModels(): HasMany
    {
        return $this->hasMany(
            OnboardingExecutionModelVersion::class,
            'discovery_policy_version_id',
        );
    }
}
