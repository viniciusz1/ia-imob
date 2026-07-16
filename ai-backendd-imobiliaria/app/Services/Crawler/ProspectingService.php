<?php

namespace App\Services\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\OnboardingPlan;
use App\Models\Crawler\Prospect;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ProspectingService
{
    public function queue(string $city, string $state, User $user, bool $requeryKnownDomains = false): CrawlerOperation
    {
        return CrawlerOperation::query()->create([
            'type' => 'prospecting',
            'state' => 'queued',
            'requested_by' => $user->id,
            'plan' => [
                'version' => 1,
                'type' => 'prospecting',
                'city' => trim($city),
                'state' => strtoupper($state),
                'max_results' => 30,
                'requery_known_domains' => $requeryKnownDomains,
            ],
        ])->refresh();
    }

    public function preview(array $cities): array
    {
        $prospects = Prospect::query()->where(function ($query) use ($cities): void {
            foreach ($cities as $city) {
                $query->orWhere(function ($query) use ($city): void {
                    $query->where('city', trim($city['city']))
                        ->where('state', strtoupper($city['state']));
                });
            }
        })->whereNotNull('root_domain')->count();

        return [
            'known_prospect_count' => $prospects,
            'known_crawl_agency_count' => CrawlAgency::query()->count(),
            'total' => $prospects + CrawlAgency::query()->count(),
        ];
    }

    public function queueGroup(
        string $name,
        array $cities,
        bool $requeryKnownDomains,
        ?int $confirmedKnownDomainCount,
        User $user,
        CrawlerOperationControlService $control,
    ): \App\Models\Crawler\OperationGroup {
        $preview = $this->preview($cities);
        if ($requeryKnownDomains && $confirmedKnownDomainCount !== $preview['total']) {
            throw ValidationException::withMessages([
                'confirmed_known_domain_count' => 'Preview the known domains and confirm the current affected count.',
            ]);
        }

        return DB::transaction(function () use ($cities, $control, $name, $requeryKnownDomains, $user) {
            $operations = collect($cities)->map(fn (array $city) => $this->queue(
                $city['city'],
                $city['state'],
                $user,
                $requeryKnownDomains,
            ));

            return $control->createGroup($name, $operations->pluck('id')->all(), $user, 'prospecting');
        });
    }

    public function decide(Prospect $prospect, string $decision, string $reason, User $user): Prospect
    {
        $prospect->update([
            'review_state' => $decision,
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
            'review_reason' => $reason,
        ]);

        return $prospect->refresh();
    }

    public function promote(Prospect $prospect, User $user): array
    {
        return DB::transaction(function () use ($prospect, $user): array {
            $locked = Prospect::query()->lockForUpdate()->findOrFail($prospect->id);
            if ($locked->promoted_crawl_agency_id !== null) {
                return [
                    'crawl_agency' => CrawlAgency::query()->findOrFail($locked->promoted_crawl_agency_id),
                    'onboarding_plan' => $locked->onboardingPlan()->firstOrFail(),
                    'created' => false,
                ];
            }
            if ($locked->review_state !== 'approved') {
                throw ValidationException::withMessages(['review_state' => 'Only approved Prospects can be promoted.']);
            }
            if ($locked->root_domain === null || $locked->base_url === null) {
                throw ValidationException::withMessages(['root_domain' => 'A website domain is required for promotion.']);
            }

            $agency = CrawlAgency::query()->create([
                'name' => $locked->name,
                'slug' => Str::slug($locked->name).'-'.$locked->id,
                'base_url' => $locked->base_url,
                'root_domain' => $locked->root_domain,
                'lifecycle_state' => 'onboarding',
            ]);
            $plan = OnboardingPlan::query()->create([
                'prospect_id' => $locked->id,
                'crawl_agency_id' => $agency->id,
                'status' => 'draft',
                'steps' => [
                    ['key' => 'review_agency', 'state' => 'pending'],
                    ['key' => 'discovery', 'state' => 'pending'],
                    ['key' => 'extraction_profile', 'state' => 'pending'],
                    ['key' => 'profile_validation', 'state' => 'pending'],
                    ['key' => 'activation', 'state' => 'pending'],
                ],
                'created_by' => $user->id,
            ]);
            $locked->update(['promoted_crawl_agency_id' => $agency->id]);

            return ['crawl_agency' => $agency, 'onboarding_plan' => $plan, 'created' => true];
        });
    }
}
