<?php

namespace App\Http\Requests\Crawler;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class QueueProductionCrawlRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'crawl_agency_id' => ['required', 'integer'],
            'discovery_mode' => ['required', Rule::in(['fresh', 'existing'])],
            'discovery_snapshot_id' => ['nullable', 'integer', 'required_if:discovery_mode,existing'],
            'extraction_profile_id' => ['nullable', 'integer'],
        ];
    }
}
