<?php

namespace App\Http\Requests\Crawler;

use Illuminate\Foundation\Http\FormRequest;

class AdoptOnboardingDiscoverySnapshotRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'discovery_snapshot_id' => ['required', 'integer'],
            'note' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
