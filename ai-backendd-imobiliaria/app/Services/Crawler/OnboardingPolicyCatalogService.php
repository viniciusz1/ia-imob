<?php

namespace App\Services\Crawler;

use App\Models\Crawler\DiscoveryPolicyVersion;
use App\Models\Crawler\ExtractionPolicyVersion;
use App\Models\Crawler\OnboardingExecutionModelVersion;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OnboardingPolicyCatalogService
{
    public function createDiscoveryPolicy(array $data, User $actor): DiscoveryPolicyVersion
    {
        return DB::transaction(function () use ($actor, $data): DiscoveryPolicyVersion {
            DB::statement("SELECT pg_advisory_xact_lock(hashtext('crawler.discovery_policy_versions'))");
            $this->ensureNewLogicalName(DiscoveryPolicyVersion::class, $data['name']);

            return DiscoveryPolicyVersion::query()->create([
                'name' => $data['name'],
                'policy_key' => (string) Str::uuid(),
                'version' => 1,
                'status' => 'draft',
                'strategies' => $data['strategies'],
                'configuration' => $data['configuration'] ?? [],
                'created_by' => $actor->id,
            ])->refresh();
        });
    }

    public function createExtractionPolicy(array $data, User $actor): ExtractionPolicyVersion
    {
        return DB::transaction(function () use ($actor, $data): ExtractionPolicyVersion {
            DB::statement("SELECT pg_advisory_xact_lock(hashtext('crawler.extraction_policy_versions'))");
            $this->ensureNewLogicalName(ExtractionPolicyVersion::class, $data['name']);

            return ExtractionPolicyVersion::query()->create([
                'name' => $data['name'],
                'policy_key' => (string) Str::uuid(),
                'version' => 1,
                'status' => 'draft',
                'strategies' => $data['strategies'],
                'configuration' => $data['configuration'] ?? [],
                'created_by' => $actor->id,
            ])->refresh();
        });
    }

    public function createExecutionModel(array $data, User $actor): OnboardingExecutionModelVersion
    {
        return DB::transaction(function () use ($actor, $data): OnboardingExecutionModelVersion {
            DB::statement("SELECT pg_advisory_xact_lock(hashtext('crawler.onboarding_execution_model_versions'))");
            $this->ensureNewLogicalName(OnboardingExecutionModelVersion::class, $data['name']);
            $discoveryPolicy = DiscoveryPolicyVersion::query()
                ->where('status', 'available')
                ->find($data['discovery_policy_version_id']);
            $extractionPolicy = ExtractionPolicyVersion::query()
                ->where('status', 'available')
                ->find($data['extraction_policy_version_id']);

            if ($discoveryPolicy === null || $extractionPolicy === null) {
                throw ValidationException::withMessages([
                    'policies' => 'The execution model requires available policy versions.',
                ]);
            }

            return OnboardingExecutionModelVersion::query()->create([
                'name' => $data['name'],
                'model_key' => (string) Str::uuid(),
                'version' => 1,
                'status' => 'draft',
                'is_default' => false,
                'discovery_policy_version_id' => $discoveryPolicy->id,
                'extraction_policy_version_id' => $extractionPolicy->id,
                'created_by' => $actor->id,
            ])->load(['discoveryPolicy', 'extractionPolicy']);
        });
    }

    public function updateDiscoveryPolicy(
        DiscoveryPolicyVersion $version,
        array $data,
    ): DiscoveryPolicyVersion {
        $this->ensureDraft($version, 'Discovery Policy');
        $version->update([
            'strategies' => $data['strategies'],
            'configuration' => $data['configuration'] ?? [],
        ]);

        return $version->refresh();
    }

    public function updateExtractionPolicy(
        ExtractionPolicyVersion $version,
        array $data,
    ): ExtractionPolicyVersion {
        $this->ensureDraft($version, 'Extraction Policy');
        $version->update([
            'strategies' => $data['strategies'],
            'configuration' => $data['configuration'] ?? [],
        ]);

        return $version->refresh();
    }

    public function updateExecutionModel(
        OnboardingExecutionModelVersion $version,
        array $data,
    ): OnboardingExecutionModelVersion {
        $this->ensureDraft($version, 'Onboarding Model');
        $this->availablePolicies(
            $data['discovery_policy_version_id'],
            $data['extraction_policy_version_id'],
        );
        $version->update([
            'discovery_policy_version_id' => $data['discovery_policy_version_id'],
            'extraction_policy_version_id' => $data['extraction_policy_version_id'],
        ]);

        return $version->refresh()->load(['discoveryPolicy', 'extractionPolicy']);
    }

    public function publishDiscoveryPolicy(DiscoveryPolicyVersion $version): DiscoveryPolicyVersion
    {
        $this->ensureDraft($version, 'Discovery Policy');
        $version->update(['status' => 'available']);

        return $version->refresh();
    }

    public function publishExtractionPolicy(ExtractionPolicyVersion $version): ExtractionPolicyVersion
    {
        $this->ensureDraft($version, 'Extraction Policy');
        $version->update(['status' => 'available']);

        return $version->refresh();
    }

    public function publishExecutionModel(
        OnboardingExecutionModelVersion $version,
    ): OnboardingExecutionModelVersion {
        $this->ensureDraft($version, 'Onboarding Model');
        $this->availablePolicies(
            $version->discovery_policy_version_id,
            $version->extraction_policy_version_id,
        );
        $version->update(['status' => 'available']);

        return $version->refresh()->load(['discoveryPolicy', 'extractionPolicy']);
    }

    public function newDiscoveryPolicyVersion(
        DiscoveryPolicyVersion $source,
        User $actor,
    ): DiscoveryPolicyVersion {
        return DB::transaction(function () use ($actor, $source): DiscoveryPolicyVersion {
            DB::statement("SELECT pg_advisory_xact_lock(hashtext('crawler.discovery_policy_versions'))");
            $this->ensureVersionable($source, 'Discovery Policy');
            $this->ensureNoDraft(DiscoveryPolicyVersion::class, 'policy_key', $source->policy_key);

            return DiscoveryPolicyVersion::query()->create([
                'name' => $source->name,
                'policy_key' => $source->policy_key,
                'version' => $this->nextVersion(DiscoveryPolicyVersion::class, 'policy_key', $source->policy_key),
                'status' => 'draft',
                'strategies' => $source->strategies,
                'configuration' => $source->configuration,
                'created_by' => $actor->id,
            ])->refresh();
        });
    }

    public function newExtractionPolicyVersion(
        ExtractionPolicyVersion $source,
        User $actor,
    ): ExtractionPolicyVersion {
        return DB::transaction(function () use ($actor, $source): ExtractionPolicyVersion {
            DB::statement("SELECT pg_advisory_xact_lock(hashtext('crawler.extraction_policy_versions'))");
            $this->ensureVersionable($source, 'Extraction Policy');
            $this->ensureNoDraft(ExtractionPolicyVersion::class, 'policy_key', $source->policy_key);

            return ExtractionPolicyVersion::query()->create([
                'name' => $source->name,
                'policy_key' => $source->policy_key,
                'version' => $this->nextVersion(ExtractionPolicyVersion::class, 'policy_key', $source->policy_key),
                'status' => 'draft',
                'strategies' => $source->strategies,
                'configuration' => $source->configuration,
                'created_by' => $actor->id,
            ])->refresh();
        });
    }

    public function newExecutionModelVersion(
        OnboardingExecutionModelVersion $source,
        User $actor,
    ): OnboardingExecutionModelVersion {
        return DB::transaction(function () use ($actor, $source): OnboardingExecutionModelVersion {
            DB::statement("SELECT pg_advisory_xact_lock(hashtext('crawler.onboarding_execution_model_versions'))");
            $this->ensureVersionable($source, 'Onboarding Model');
            $this->ensureNoDraft(OnboardingExecutionModelVersion::class, 'model_key', $source->model_key);
            $this->availablePolicies(
                $source->discovery_policy_version_id,
                $source->extraction_policy_version_id,
            );

            return OnboardingExecutionModelVersion::query()->create([
                'name' => $source->name,
                'model_key' => $source->model_key,
                'version' => $this->nextVersion(OnboardingExecutionModelVersion::class, 'model_key', $source->model_key),
                'status' => 'draft',
                'is_default' => false,
                'discovery_policy_version_id' => $source->discovery_policy_version_id,
                'extraction_policy_version_id' => $source->extraction_policy_version_id,
                'created_by' => $actor->id,
            ])->load(['discoveryPolicy', 'extractionPolicy']);
        });
    }

    public function archiveDiscoveryPolicy(DiscoveryPolicyVersion $version): DiscoveryPolicyVersion
    {
        $this->ensureArchivable($version, 'Discovery Policy');
        if ($version->activeCrawlAgencies()->exists()) {
            throw ValidationException::withMessages([
                'status' => 'Replace this active Discovery Policy before archiving it.',
            ]);
        }
        if ($version->executionModels()->whereIn('status', ['draft', 'available'])->exists()) {
            throw ValidationException::withMessages([
                'status' => 'Archive dependent Onboarding Models before archiving this Discovery Policy.',
            ]);
        }
        $version->update(['status' => 'archived']);

        return $version->refresh();
    }

    public function archiveExtractionPolicy(ExtractionPolicyVersion $version): ExtractionPolicyVersion
    {
        $this->ensureArchivable($version, 'Extraction Policy');
        if ($version->executionModels()->whereIn('status', ['draft', 'available'])->exists()) {
            throw ValidationException::withMessages([
                'status' => 'Archive dependent Onboarding Models before archiving this Extraction Policy.',
            ]);
        }
        $version->update(['status' => 'archived']);

        return $version->refresh();
    }

    public function archiveExecutionModel(
        OnboardingExecutionModelVersion $version,
    ): OnboardingExecutionModelVersion {
        $this->ensureArchivable($version, 'Onboarding Model');
        $version->update([
            'status' => 'archived',
            'is_default' => false,
        ]);

        return $version->refresh()->load(['discoveryPolicy', 'extractionPolicy']);
    }

    public function makeDefault(
        OnboardingExecutionModelVersion $version,
    ): OnboardingExecutionModelVersion {
        $this->ensureAvailable($version, 'Onboarding Model');

        return DB::transaction(function () use ($version): OnboardingExecutionModelVersion {
            DB::statement("SELECT pg_advisory_xact_lock(hashtext('crawler.onboarding_default_model'))");
            OnboardingExecutionModelVersion::query()
                ->where('is_default', true)
                ->update(['is_default' => false]);
            $version->update(['is_default' => true]);

            return $version->refresh()->load(['discoveryPolicy', 'extractionPolicy']);
        });
    }

    private function availablePolicies(int $discoveryId, int $extractionId): array
    {
        $discoveryPolicy = DiscoveryPolicyVersion::query()
            ->where('status', 'available')
            ->find($discoveryId);
        $extractionPolicy = ExtractionPolicyVersion::query()
            ->where('status', 'available')
            ->find($extractionId);

        if ($discoveryPolicy === null || $extractionPolicy === null) {
            throw ValidationException::withMessages([
                'policies' => 'The execution model requires available policy versions.',
            ]);
        }

        return [$discoveryPolicy, $extractionPolicy];
    }

    private function ensureNewLogicalName(string $modelClass, string $name): void
    {
        if ($modelClass::query()->whereRaw('lower(name) = lower(?)', [$name])->exists()) {
            throw ValidationException::withMessages([
                'name' => 'This catalog name is already in use.',
            ]);
        }
    }

    private function ensureDraft(object $version, string $label): void
    {
        if ($version->status !== 'draft') {
            throw ValidationException::withMessages([
                'status' => "Only a draft {$label} version can be edited or published.",
            ]);
        }
    }

    private function ensureAvailable(object $version, string $label): void
    {
        if ($version->status !== 'available') {
            throw ValidationException::withMessages([
                'status' => "Only an available {$label} version can be archived or selected.",
            ]);
        }
    }

    private function ensureArchivable(object $version, string $label): void
    {
        if (! in_array($version->status, ['draft', 'available'], true)) {
            throw ValidationException::withMessages([
                'status' => "Only a draft or available {$label} version can be archived.",
            ]);
        }
    }

    private function ensureVersionable(object $source, string $label): void
    {
        if (! in_array($source->status, ['available', 'archived'], true)) {
            throw ValidationException::withMessages([
                'status' => "Publish the {$label} draft before creating another version.",
            ]);
        }
    }

    private function ensureNoDraft(string $modelClass, string $keyColumn, string $key): void
    {
        if ($modelClass::query()->where($keyColumn, $key)->where('status', 'draft')->exists()) {
            throw ValidationException::withMessages([
                'status' => 'Finish or archive the existing draft before creating another version.',
            ]);
        }
    }

    private function nextVersion(
        string $modelClass,
        string $keyColumn,
        string $key,
    ): int {
        return ((int) $modelClass::query()->where($keyColumn, $key)->max('version')) + 1;
    }
}
