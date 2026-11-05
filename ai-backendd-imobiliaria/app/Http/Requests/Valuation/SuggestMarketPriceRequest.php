<?php

namespace App\Http\Requests\Valuation;

use App\Domain\Valuation\ValuationInput;

class SuggestMarketPriceRequest extends StoreValuationRequest
{
    public function rules(): array
    {
        return array_replace(parent::rules(), [
            'purpose' => array_values(array_filter(parent::rules()['purpose'], static fn ($rule): bool => $rule !== 'sometimes')),
            'city' => ['required', 'array', 'size:1'],
            'neighborhood' => ['required', 'array', 'size:1'],
            'comparable_reviews' => ['prohibited'],
        ]);
    }

    public function valuationInput(): ValuationInput
    {
        $data = $this->validated();

        return new ValuationInput(
            city: $data['city'],
            neighborhood: $data['neighborhood'],
            residentialType: $data['residential_type'],
            area: (float) $data['area'],
            bedrooms: (int) $data['bedrooms'],
            bathrooms: (int) $data['bathrooms'],
            garageSpaces: (int) $data['garage_spaces'],
            floodRisk: (bool) $data['flood_risk'],
            purpose: $data['purpose'],
        );
    }
}
