<?php

declare(strict_types=1);

namespace App\Services\Auction;

use App\Models\AuctionEvent;
use App\Models\AuctionEventProperty;
use App\Models\AuctionEvidence;
use App\Models\AuctionProperty;
use App\Models\AuctionRound;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Upserts one normalized auction lot (event + property + rounds + evidence).
 *
 * The owner is either a Crawl Agency (legacy webhook) or an Auction Crawler
 * Source (sitemap crawler). Identity is (owner, external_id, lot_number), so
 * re-crawling the same sitemap updates lots instead of duplicating them.
 */
class AuctionRecordIngestor
{
    /**
     * Validation rules for one record payload, shared by every entry point.
     *
     * @return array<string, mixed>
     */
    public static function rules(string $prefix = ''): array
    {
        $p = $prefix === '' ? '' : $prefix.'.';

        return [
            "{$p}source.external_id" => ['required', 'string', 'max:255'],
            "{$p}source.canonical_url" => ['nullable', 'url', 'max:1024'],
            "{$p}event.title" => ['required', 'string', 'max:255'],
            "{$p}event.sale_modality" => ['nullable', 'string', 'max:50'],
            "{$p}event.status" => ['nullable', 'string', 'max:50'],
            "{$p}event.auctioneer_name" => ['nullable', 'string', 'max:255'],
            "{$p}event.seller_or_court" => ['nullable', 'string', 'max:255'],
            "{$p}property.lot_number" => ['nullable', 'string', 'max:50'],
            "{$p}property.title" => ['nullable', 'string', 'max:255'],
            "{$p}property.description" => ['nullable', 'string'],
            "{$p}property.property_type" => ['nullable', 'string', 'max:50'],
            "{$p}property.city" => ['nullable', 'string', 'max:255'],
            "{$p}property.state" => ['nullable', 'string', 'size:2'],
            "{$p}property.address" => ['nullable', 'string', 'max:255'],
            "{$p}property.neighborhood" => ['nullable', 'string', 'max:255'],
            "{$p}property.occupancy_status" => ['nullable', 'string', 'max:50'],
            "{$p}property.built_area_m2" => ['nullable', 'numeric'],
            "{$p}property.land_area_m2" => ['nullable', 'numeric'],
            "{$p}property.registration_number" => ['nullable', 'string', 'max:255'],
            "{$p}rounds" => ['nullable', 'array'],
            "{$p}rounds.*.round_number" => ['required', 'integer', 'min:1'],
            "{$p}rounds.*.starts_at" => ['nullable', 'date'],
            "{$p}rounds.*.ends_at" => ['nullable', 'date'],
            "{$p}rounds.*.minimum_bid" => ['nullable', 'numeric'],
            "{$p}rounds.*.appraisal_value" => ['nullable', 'numeric'],
            "{$p}rounds.*.source_label" => ['nullable', 'string', 'max:100'],
            "{$p}evidence" => ['nullable', 'array'],
            "{$p}evidence.*.kind" => ['required', 'string', 'max:50'],
            "{$p}evidence.*.url" => ['required', 'url', 'max:2048'],
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function ingest(array $data, ?int $crawlAgencyId = null, ?int $sourceId = null): AuctionEvent
    {
        if (($crawlAgencyId === null) === ($sourceId === null)) {
            throw new InvalidArgumentException('Exactly one owner (crawl agency or auction source) is required.');
        }

        $externalKey = (string) $data['source']['external_id'];
        $ownerKey = $sourceId !== null ? "src{$sourceId}" : (string) $crawlAgencyId;
        $property = $data['property'] ?? [];
        $lotNumber = (string) ($property['lot_number'] ?? '1');

        return DB::transaction(function () use ($data, $crawlAgencyId, $sourceId, $externalKey, $ownerKey, $property, $lotNumber): AuctionEvent {
            $identity = $sourceId !== null
                ? ['auction_crawler_source_id' => $sourceId, 'external_key' => $externalKey]
                : ['crawl_agency_id' => $crawlAgencyId, 'external_key' => $externalKey];

            $event = AuctionEvent::updateOrCreate($identity, [
                'canonical_url' => $data['source']['canonical_url'] ?? null,
                'title' => $data['event']['title'],
                'sale_modality' => $data['event']['sale_modality'] ?? 'unknown',
                'status' => $data['event']['status'] ?? 'unknown',
                'auctioneer_name' => $data['event']['auctioneer_name'] ?? null,
                'court_or_seller' => $data['event']['seller_or_court'] ?? null,
                'source_payload' => $data,
                'last_observed_at' => now(),
            ]);

            if (! $event->first_observed_at) {
                $event->first_observed_at = now();
                $event->save();
            }

            $auctionProperty = AuctionProperty::updateOrCreate(
                ['property_key' => "{$ownerKey}-{$externalKey}-{$lotNumber}"],
                [
                    'property_type' => $property['property_type'] ?? 'unknown',
                    'title' => $property['title'] ?? $data['event']['title'],
                    'description' => $property['description'] ?? null,
                    'address' => $property['address'] ?? null,
                    'neighborhood' => $property['neighborhood'] ?? null,
                    'city' => $property['city'] ?? null,
                    'state' => $property['state'] ?? null,
                    'occupancy_status' => $property['occupancy_status'] ?? 'unknown',
                    'built_area_m2' => $property['built_area_m2'] ?? null,
                    'land_area_m2' => $property['land_area_m2'] ?? null,
                    'registration_number' => $property['registration_number'] ?? null,
                    'source_payload' => $property,
                ]
            );

            $eventProperty = AuctionEventProperty::updateOrCreate(
                ['auction_event_id' => $event->id, 'lot_number' => $lotNumber],
                [
                    'auction_property_id' => $auctionProperty->id,
                    'canonical_url' => $data['source']['canonical_url'] ?? null,
                    'observed_at' => now(),
                ]
            );

            $rounds = $data['rounds'] ?? [];
            if ($rounds !== []) {
                AuctionRound::where('auction_event_property_id', $eventProperty->id)
                    ->whereNotIn('round_number', array_column($rounds, 'round_number'))
                    ->delete();

                $currentRoundId = null;
                foreach ($rounds as $round) {
                    $model = AuctionRound::updateOrCreate(
                        ['auction_event_property_id' => $eventProperty->id, 'round_number' => $round['round_number']],
                        [
                            'starts_at' => $round['starts_at'] ?? null,
                            'ends_at' => $round['ends_at'] ?? null,
                            'minimum_bid' => $round['minimum_bid'] ?? null,
                            'appraisal_value' => $round['appraisal_value'] ?? null,
                            'source_label' => $round['source_label'] ?? null,
                            'status' => 'scheduled',
                        ]
                    );
                    $currentRoundId ??= $model->id;
                }

                $eventProperty->current_round_id = $currentRoundId;
                $eventProperty->save();
            }

            $evidence = $data['evidence'] ?? [];
            if ($evidence !== []) {
                AuctionEvidence::where('auction_event_property_id', $eventProperty->id)->delete();
                foreach ($evidence as $item) {
                    AuctionEvidence::create([
                        'auction_event_property_id' => $eventProperty->id,
                        'kind' => $item['kind'],
                        'url' => $item['url'],
                        'captured_at' => now(),
                    ]);
                }
            }

            return $event;
        });
    }
}
