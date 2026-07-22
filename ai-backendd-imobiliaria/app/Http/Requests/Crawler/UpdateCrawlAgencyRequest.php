<?php

namespace App\Http\Requests\Crawler;

use App\Models\Crawler\CrawlAgency;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCrawlAgencyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'root_domain' => strtolower(trim((string) $this->input('root_domain'))),
        ]);
    }

    public function rules(): array
    {
        $crawlAgency = $this->route('crawlAgency');

        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', Rule::unique(CrawlAgency::class, 'slug')->ignore($crawlAgency)],
            'base_url' => ['required', 'url:http,https', 'max:2048'],
            'root_domain' => ['required', 'string', 'max:255', Rule::unique(CrawlAgency::class, 'root_domain')->ignore($crawlAgency)],
        ];
    }
}
