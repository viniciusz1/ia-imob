<?php

namespace App\Http\Requests\Valuation;

use App\Domain\Valuation\ResidentialType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreValuationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('valuations.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'city' => ['required', 'array', 'min:1'],
            'city.*' => ['required', 'string', 'max:120'],
            'neighborhood' => ['required', 'array', 'min:1'],
            'neighborhood.*' => ['required', 'string', 'max:120'],
            'residential_type' => ['required', 'string', Rule::in(ResidentialType::values())],
            'area' => ['required', 'numeric', 'min:20', 'max:2000'],
            'bedrooms' => ['required', 'integer', 'min:0', 'max:10'],
            'bathrooms' => ['required', 'integer', 'min:0', 'max:10'],
            'garage_spaces' => ['required', 'integer', 'min:0', 'max:10'],
            'flood_risk' => ['required', 'boolean'],
            'comparable_reviews' => ['sometimes', 'array'],
            'comparable_reviews.*.market_property_id' => ['required_with:comparable_reviews', 'integer'],
            'comparable_reviews.*.status' => ['required_with:comparable_reviews', 'string', Rule::in(['approved', 'rejected'])],
        ];
    }
}
