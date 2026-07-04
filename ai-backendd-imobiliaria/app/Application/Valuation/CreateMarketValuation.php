<?php

namespace App\Application\Valuation;

use App\Domain\Valuation\MarketValuationCalculator;
use App\Domain\Valuation\ValuationInput;
use App\Models\PropertyValuation;
use App\Models\User;
use Illuminate\Support\Facades\DB;

final readonly class CreateMarketValuation
{
    public function __construct(private MarketValuationCalculator $calculator) {}

    public function execute(User $user, ValuationInput $input, ?array $comparableReviews = null): PropertyValuation
    {
        $result = $comparableReviews === null
            ? $this->calculator->calculate($input)
            : $this->calculator->calculateReviewed($input, $comparableReviews);

        return DB::transaction(function () use ($user, $input, $result): PropertyValuation {
            $valuation = PropertyValuation::create([
                'agency_id' => $user->agency_id,
                'user_id' => $user->id,
                'code' => $this->nextCode(),
                'status' => $result->status,
                'city' => $input->city,
                'neighborhood' => $input->neighborhood,
                'residential_type' => $input->residentialType,
                'area' => $input->area,
                'bedrooms' => $input->bedrooms,
                'bathrooms' => $input->bathrooms,
                'garage_spaces' => $input->garageSpaces,
                'flood_risk' => $input->floodRisk,
                'base_min_value' => $result->baseRange['min'] ?? null,
                'base_central_value' => $result->baseRange['central'] ?? null,
                'base_max_value' => $result->baseRange['max'] ?? null,
                'final_min_value' => $result->finalRange['min'] ?? null,
                'final_central_value' => $result->finalRange['central'] ?? null,
                'final_max_value' => $result->finalRange['max'] ?? null,
                'flood_adjustment_percent' => $result->floodAdjustmentPercent,
                'sample_summary' => $result->sampleSummary,
                'comparable_evidence' => $result->comparableEvidence,
            ]);

            return $valuation->load('user:id,name,email');
        });
    }

    private function nextCode(): string
    {
        $prefix = 'AVL-'.now()->format('Y').'-';
        $next = (PropertyValuation::withoutGlobalScopes()
            ->where('code', 'like', $prefix.'%')
            ->count()) + 1;

        return $prefix.str_pad((string) $next, 6, '0', STR_PAD_LEFT);
    }
}
