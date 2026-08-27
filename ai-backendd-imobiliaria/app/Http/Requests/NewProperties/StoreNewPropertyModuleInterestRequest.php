<?php

declare(strict_types=1);

namespace App\Http\Requests\NewProperties;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreNewPropertyModuleInterestRequest extends FormRequest
{
    private const INTENDED_USES = [
        'monitor_new_listings',
        'prospect_owners',
        'match_clients',
        'follow_market',
    ];

    public function authorize(): bool
    {
        return $this->user()?->agency_id !== null
            && ($this->user()?->can('properties.view') ?? false);
    }

    public function rules(): array
    {
        return [
            'intended_uses' => ['required', 'array', 'min:1', 'max:4'],
            'intended_uses.*' => [
                'required',
                'string',
                'distinct',
                Rule::in(self::INTENDED_USES),
            ],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
