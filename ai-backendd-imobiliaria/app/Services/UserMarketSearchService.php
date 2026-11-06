<?php

namespace App\Services;

use App\Exceptions\UserMarketSearchLimitExceeded;
use App\Models\User;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Support\Facades\DB;
use Throwable;

class UserMarketSearchService
{
    public function execute(User $user, string $mode, array $query, Closure $search): mixed
    {
        $date = CarbonImmutable::now(MarketSearchQuotaService::TIMEZONE)->toDateString();
        DB::transaction(function () use ($user, $date): void {
            $locked = User::query()->lockForUpdate()->findOrFail($user->id);
            DB::table('user_market_search_daily_usage')->insertOrIgnore([
                'user_id' => $user->id, 'usage_date' => $date, 'used_count' => 0,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            $usage = DB::table('user_market_search_daily_usage')->where('user_id', $user->id)->where('usage_date', $date)->lockForUpdate()->first();
            if ($usage->used_count >= $locked->market_search_daily_limit) {
                throw new UserMarketSearchLimitExceeded([
                    'limit' => (int) $locked->market_search_daily_limit,
                    'used' => (int) $usage->used_count,
                    'remaining' => 0,
                    'resets_at' => CarbonImmutable::parse($date, MarketSearchQuotaService::TIMEZONE)->addDay()->toIso8601String(),
                ]);
            }
            DB::table('user_market_search_daily_usage')->where('id', $usage->id)->increment('used_count');
        });

        try {
            $result = $search();
            DB::table('market_search_history')->insert([
                'user_id' => $user->id,
                'agency_id' => $user->agency_id,
                'mode' => $mode,
                'query' => json_encode($query, JSON_THROW_ON_ERROR),
                'created_at' => now(),
            ]);

            return $result;
        } catch (Throwable $exception) {
            DB::table('user_market_search_daily_usage')->where('user_id', $user->id)->where('usage_date', $date)->decrement('used_count');
            throw $exception;
        }
    }
}
