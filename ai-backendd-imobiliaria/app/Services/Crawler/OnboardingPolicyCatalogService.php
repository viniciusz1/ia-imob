<?php

namespace App\Services\Crawler;

use App\Models\Crawler\DiscoveryPolicyVersion;
use App\Models\Crawler\ExtractionPolicyVersion;
use App\Models\Crawler\OnboardingExecutionModelVersion;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OnboardingPolicyCatalogService
{
    public function createDiscoveryPolicy(array $data, User $actor): DiscoveryPolicyVersion
    {
        return DB::transaction(function () use ($actor, $data): DiscoveryPolicyVersion {
            DB::statement("SELECT pg_advisory_xact_lock(hashtext('crawler.discovery_policy_versions'))");

            return DiscoveryPolicyVersion::query()->create([
                'name' => $data['name'],
                'version' => $this->nextVersion(DiscoveryPolicyVersion::class, $data['name']),
                'status' => 'available',
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

            return ExtractionPolicyVersion::query()->create([
                'name' => $data['name'],
                'version' => $this->nextVersion(ExtractionPolicyVersion::class, $data['name']),
                'status' => 'available',
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
                'version' => $this->nextVersion(OnboardingExecutionModelVersion::class, $data['name']),
                'status' => 'available',
                'discovery_policy_version_id' => $discoveryPolicy->id,
                'extraction_policy_version_id' => $extractionPolicy->id,
                'created_by' => $actor->id,
            ])->load(['discoveryPolicy', 'extractionPolicy']);
        });
    }

    private function nextVersion(string $modelClass, string $name): int
    {
        return ((int) $modelClass::query()->where('name', $name)->max('version')) + 1;
    }
}
