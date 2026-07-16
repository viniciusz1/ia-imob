<?php

namespace App\Services\Crawler;

use App\Models\Crawler\ListingIdentity;
use App\Models\Crawler\ListingVersion;
use App\Models\CrawlerRun;
use App\Models\MarketProperty;

class ListingInventoryService
{
    public function __construct(private readonly ListingKeyResolver $keys) {}

    public function applyPublishedSnapshot(CrawlerRun $run): void
    {
        $observedIdentityIds = [];
        $run->marketProperties()->orderBy('id')->each(function (MarketProperty $property) use ($run, &$observedIdentityIds): void {
            $payload = $property->payload;
            $url = $property->link_imovel ?? ($payload['url'] ?? null);
            $listingKey = $this->keys->resolve($payload, is_string($url) ? $url : null);
            $identity = ListingIdentity::query()->firstOrCreate(
                ['crawl_agency_id' => $run->crawl_agency_id, 'listing_key' => $listingKey],
                [
                    'external_id' => $this->keys->externalId($payload),
                    'canonical_url' => $this->keys->canonicalizeUrl((string) $url),
                    'inventory_state' => 'active',
                ],
            );
            $isNew = $identity->wasRecentlyCreated;
            $identity->refresh();
            $previousVersion = $identity->current_version_id === null
                ? null
                : ListingVersion::query()->find($identity->current_version_id);
            $contentHash = hash('sha256', json_encode($this->canonicalPayload($payload), JSON_THROW_ON_ERROR));
            $removalReason = $this->explicitRemovalReason($payload);
            $classification = $isNew
                ? 'new'
                : ($identity->inventory_state === 'removed'
                    ? 'reappeared'
                    : ($previousVersion?->content_hash === $contentHash ? 'unchanged' : 'changed'));
            if ($removalReason !== null) {
                $classification = 'removed';
            }
            $version = ListingVersion::query()->create([
                'listing_identity_id' => $identity->id,
                'crawl_run_id' => $run->id,
                'market_property_id' => $property->id,
                'classification' => $classification,
                'content_hash' => $contentHash,
                'observed_payload' => $payload,
                'absence_count' => $removalReason === null ? 0 : 2,
                'reason' => $removalReason,
                'observed_at' => now(),
            ]);
            $identity->update([
                'external_id' => $this->keys->externalId($payload),
                'canonical_url' => $this->keys->canonicalizeUrl((string) $url),
                'inventory_state' => $removalReason === null ? 'active' : 'removed',
                'consecutive_absences' => $removalReason === null ? 0 : 2,
                'absence_reason' => $removalReason,
                'current_version_id' => $version->id,
                'current_market_property_id' => $property->id,
                'last_seen_crawl_run_id' => $run->id,
                'last_observed_at' => now(),
            ]);
            $observedIdentityIds[] = $identity->id;
        });

        ListingIdentity::query()
            ->where('crawl_agency_id', $run->crawl_agency_id)
            ->whereNotIn('id', $observedIdentityIds)
            ->where('inventory_state', '!=', 'removed')
            ->lockForUpdate()
            ->each(function (ListingIdentity $identity) use ($run): void {
                $absenceCount = $identity->consecutive_absences + 1;
                $state = $absenceCount >= 2 ? 'removed' : 'missing';
                $version = ListingVersion::query()->create([
                    'listing_identity_id' => $identity->id,
                    'crawl_run_id' => $run->id,
                    'market_property_id' => null,
                    'classification' => $state,
                    'content_hash' => null,
                    'observed_payload' => [],
                    'absence_count' => $absenceCount,
                    'reason' => 'not_observed',
                    'observed_at' => now(),
                ]);
                $identity->update([
                    'inventory_state' => $state,
                    'consecutive_absences' => $absenceCount,
                    'absence_reason' => 'not_observed',
                    'current_version_id' => $version->id,
                ]);
            });
    }

    private function explicitRemovalReason(array $payload): ?string
    {
        $status = filter_var($payload['http_status'] ?? null, FILTER_VALIDATE_INT);
        if (in_array($status, [404, 410], true)) {
            return "http_{$status}";
        }
        if (($payload['explicit_unavailable'] ?? false) === true || ($payload['is_available'] ?? true) === false) {
            return 'explicit_unavailable';
        }
        $availability = strtolower(trim((string) ($payload['availability'] ?? '')));

        return in_array($availability, ['unavailable', 'removed', 'sold', 'inactive'], true)
            ? "availability_{$availability}"
            : null;
    }

    private function canonicalPayload(array $payload): array
    {
        foreach ($payload as &$value) {
            if (is_array($value)) {
                $value = $this->canonicalPayload($value);
            }
        }
        unset($value);
        if (! array_is_list($payload)) {
            ksort($payload);
        }

        return $payload;
    }
}
