<?php

namespace App\Services\Auction;

use App\Models\AuctionEvent;
use App\Models\AuctionEventProperty;
use App\Models\AuctionRound;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AuctionLifecycleService
{
    /**
     * Expire finished auction rounds, event properties and events.
     *
     * @return array{expired_rounds: int, expired_properties: int, closed_events: int}
     */
    public function expireFinishedAuctions(?Carbon $asOf = null): array
    {
        $asOf = $asOf ?? Carbon::now();

        return DB::transaction(function () use ($asOf) {
            $expiredRounds = $this->expireFinishedRounds($asOf);
            $expiredProperties = $this->expireFinishedEventProperties();
            $closedEvents = $this->closeFinishedEvents();

            Log::info('Auction lifecycle check executed', [
                'as_of' => $asOf->toIso8601String(),
                'expired_rounds' => $expiredRounds,
                'expired_properties' => $expiredProperties,
                'closed_events' => $closedEvents,
            ]);

            return [
                'expired_rounds' => $expiredRounds,
                'expired_properties' => $expiredProperties,
                'closed_events' => $closedEvents,
            ];
        });
    }

    /**
     * Mark rounds as expired where ends_at < asOf (or starts_at + 1 day < asOf when ends_at is null).
     */
    public function expireFinishedRounds(Carbon $asOf): int
    {
        return AuctionRound::query()
            ->whereIn('status', ['scheduled', 'open'])
            ->where(function ($query) use ($asOf) {
                $query->where(function ($sub) use ($asOf) {
                    $sub->whereNotNull('ends_at')
                        ->where('ends_at', '<', $asOf);
                })->orWhere(function ($sub) use ($asOf) {
                    $sub->whereNull('ends_at')
                        ->whereNotNull('starts_at')
                        ->where('starts_at', '<', $asOf->copy()->subDay());
                });
            })
            ->update([
                'status' => 'expired',
                'updated_at' => Carbon::now(),
            ]);
    }

    /**
     * Mark event properties as expired if all their rounds are closed or expired.
     */
    public function expireFinishedEventProperties(): int
    {
        $propertiesToExpire = AuctionEventProperty::query()
            ->where('inventory_state', 'published')
            ->whereHas('rounds')
            ->whereDoesntHave('rounds', function ($query) {
                $query->whereNotIn('status', ['closed', 'expired']);
            })
            ->pluck('id');

        if ($propertiesToExpire->isEmpty()) {
            return 0;
        }

        return AuctionEventProperty::query()
            ->whereIn('id', $propertiesToExpire)
            ->update([
                'inventory_state' => 'expired',
                'updated_at' => Carbon::now(),
            ]);
    }

    /**
     * Close auction events if all their event properties are expired.
     */
    public function closeFinishedEvents(): int
    {
        $eventsToClose = AuctionEvent::query()
            ->whereIn('status', ['scheduled', 'open'])
            ->whereHas('eventProperties')
            ->whereDoesntHave('eventProperties', function ($query) {
                $query->where('inventory_state', '!=', 'expired');
            })
            ->pluck('id');

        if ($eventsToClose->isEmpty()) {
            return 0;
        }

        return AuctionEvent::query()
            ->whereIn('id', $eventsToClose)
            ->update([
                'status' => 'closed',
                'updated_at' => Carbon::now(),
            ]);
    }
}
