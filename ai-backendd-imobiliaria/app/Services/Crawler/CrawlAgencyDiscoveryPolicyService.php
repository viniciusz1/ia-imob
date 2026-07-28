<?php

namespace App\Services\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\DiscoveryPolicyVersion;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CrawlAgencyDiscoveryPolicyService
{
    public function __construct(
        private readonly OnboardingPolicyCatalogService $catalog,
    ) {}

    public function activateNewVersionFrom(
        CrawlAgency $agency,
        int $sourcePolicyVersionId,
        User $actor,
    ): CrawlAgency {
        return DB::transaction(function () use ($actor, $agency, $sourcePolicyVersionId): CrawlAgency {
            DB::statement('SELECT pg_advisory_xact_lock(?)', [$agency->id]);
            $lockedAgency = CrawlAgency::query()
                ->lockForUpdate()
                ->findOrFail($agency->id);
            if ($lockedAgency->lifecycle_state !== 'active') {
                throw ValidationException::withMessages([
                    'crawl_agency_id' => 'Only an active Crawl Agency can replace its active Discovery Policy.',
                ]);
            }

            $source = DiscoveryPolicyVersion::query()
                ->whereKey($sourcePolicyVersionId)
                ->where('status', 'available')
                ->first();
            if ($source === null) {
                throw ValidationException::withMessages([
                    'source_policy_version_id' => 'Choose an available Discovery Policy version.',
                ]);
            }

            $draft = $this->catalog->newDiscoveryPolicyVersion($source, $actor);
            $active = $this->catalog->publishDiscoveryPolicy($draft);
            $lockedAgency->update([
                'active_discovery_policy_version_id' => $active->id,
            ]);

            return $lockedAgency->refresh()->load('activeDiscoveryPolicy');
        });
    }
}
