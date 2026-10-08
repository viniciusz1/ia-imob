<?php

namespace App\Http\Requests\Analytics;

use App\Domain\Analytics\MarketAnalyticsFilters;
use Illuminate\Foundation\Http\FormRequest;

class MarketAnalyticsFilterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'data_inicio' => ['sometimes', 'date'],
            'data_fim' => ['sometimes', 'date', 'after_or_equal:data_inicio'],
            'cidade' => ['sometimes', 'string', 'max:255'],
            'bairro' => ['sometimes', 'array', 'max:50'],
            'bairro.*' => ['string', 'max:255'],
            'tipo' => ['sometimes', 'array', 'max:50'],
            'tipo.*' => ['string', 'max:255'],
            'imobiliaria' => ['sometimes', 'array', 'max:50'],
            'imobiliaria.*' => ['string', 'max:255'],
            'quartos' => ['sometimes', 'array', 'max:10'],
            'quartos.*' => ['integer', 'min:0', 'max:20'],
            'vagas' => ['sometimes', 'array', 'max:10'],
            'vagas.*' => ['integer', 'min:0', 'max:20'],
            'min' => ['sometimes', 'numeric', 'min:0'],
            'max' => ['sometimes', 'numeric', 'min:0', 'gte:min'],
            'area_min' => ['sometimes', 'numeric', 'min:0'],
            'area_max' => ['sometimes', 'numeric', 'min:0', 'gte:area_min'],
            'limite' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ];
    }

    public function filters(): MarketAnalyticsFilters
    {
        return MarketAnalyticsFilters::fromArray($this->validated());
    }

    public function limit(int $default = 10): int
    {
        return (int) ($this->validated()['limite'] ?? $default);
    }
}
