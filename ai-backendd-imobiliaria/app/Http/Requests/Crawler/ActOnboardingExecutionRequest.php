<?php

namespace App\Http\Requests\Crawler;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ActOnboardingExecutionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'action' => [
                'required',
                Rule::in([
                    'run_discovery',
                    'confirm_sample_url',
                    'run_profile_generation',
                    'run_profile_validation',
                    'correct_sample_url',
                ]),
            ],
            'sample_url' => ['nullable', 'url:http,https', 'max:2048'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $action = $this->input('action');
                $hasSampleUrl = filled($this->input('sample_url'));
                $requiresSampleUrl = in_array(
                    $action,
                    ['confirm_sample_url', 'correct_sample_url'],
                    true,
                );

                if ($requiresSampleUrl && ! $hasSampleUrl) {
                    $validator->errors()->add(
                        'sample_url',
                        'A confirmed sample URL is required for this action.',
                    );
                }
                if (! $requiresSampleUrl && $hasSampleUrl) {
                    $validator->errors()->add(
                        'sample_url',
                        'The sample URL is only accepted by confirmation or correction actions.',
                    );
                }
            },
        ];
    }
}
