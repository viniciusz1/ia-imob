<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\MarketSearchQuotaService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminMarketSearchController extends Controller
{
    public function users(Request $request)
    {
        $date = CarbonImmutable::now(MarketSearchQuotaService::TIMEZONE)->toDateString();

        return User::query()->whereNotNull('agency_id')->with('agency:id,name')
            ->when($request->integer('agency_id'), fn ($query, $id) => $query->where('agency_id', $id))
            ->leftJoin('user_market_search_daily_usage as usage', function ($join) use ($date): void {
                $join->on('usage.user_id', '=', 'users.id')->where('usage.usage_date', '=', $date);
            })->select('users.id', 'users.name', 'users.email', 'users.agency_id', 'users.market_search_daily_limit')
            ->selectRaw('COALESCE(usage.used_count, 0) as used_today')->orderBy('users.name')->paginate(25);
    }

    public function update(Request $request, User $user)
    {
        abort_if($user->agency_id === null, 404);
        $data = $request->validate(['limit' => ['required', 'integer', 'min:0', 'max:1000000']]);
        $user->forceFill(['market_search_daily_limit' => $data['limit']])->save();

        return response()->json(['id' => $user->id, 'limit' => $user->market_search_daily_limit]);
    }

    public function history(Request $request)
    {
        $data = $request->validate([
            'user_id' => ['sometimes', 'integer'], 'agency_id' => ['sometimes', 'integer'],
            'from' => ['sometimes', 'date_format:Y-m-d'], 'to' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from'],
        ]);
        $query = DB::table('market_search_history as history')
            ->join('users', 'users.id', '=', 'history.user_id')
            ->join('agencies', 'agencies.id', '=', 'history.agency_id')
            ->select('history.*', 'users.name as user_name', 'agencies.name as agency_name');
        foreach (['user_id', 'agency_id'] as $key) {
            if (isset($data[$key])) {
                $query->where('history.'.$key, $data[$key]);
            }
        }
        if (isset($data['from'])) {
            $query->where('history.created_at', '>=', CarbonImmutable::parse($data['from'], MarketSearchQuotaService::TIMEZONE)->startOfDay()->utc());
        }
        if (isset($data['to'])) {
            $query->where('history.created_at', '<', CarbonImmutable::parse($data['to'], MarketSearchQuotaService::TIMEZONE)->addDay()->startOfDay()->utc());
        }

        return $query->orderByDesc('history.created_at')->orderByDesc('history.id')->paginate(25);
    }
}
