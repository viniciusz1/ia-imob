<?php

namespace App\Http\Requests\Crawler;

use App\Enums\Crawler\CrawlAgencyLifecycle;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TransitionCrawlAgencyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'lifecycle_state' => [
                'required',
                Rule::enum(CrawlAgencyLifecycle::class),
            ],
        ];
    }
}
