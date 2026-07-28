<?php

namespace App\Http\Requests\Crawler;

use App\Support\Crawler\OnboardingStrategyCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateExtractionPolicyVersionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'strategies' => ['required', 'array', 'min:1'],
            'strategies.*' => [
                'required',
                'string',
                'max:80',
                'distinct',
                Rule::in(OnboardingStrategyCatalog::EXTRACTION_STRATEGIES),
            ],
            'configuration' => ['sometimes', 'array'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $strategies = $this->input('strategies', []);
                if (
                    is_array($strategies)
                    && ! OnboardingStrategyCatalog::isCanonicalExtractionOrder($strategies)
                ) {
                    $validator->errors()->add(
                        'strategies',
                        'Extraction strategies must preserve the canonical fallback order.',
                    );
                }
            },
        ];
    }
}
