<?php

namespace App\Http\Requests\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Support\Crawler\AgencyNameNormalizer;
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
        $payload = [
            'root_domain' => strtolower(trim((string) $this->input('root_domain'))),
        ];

        if ($this->has('name')) {
            $payload['name'] = AgencyNameNormalizer::normalize(
                (string) $this->input('name'),
                $this->input('city') ? (string) $this->input('city') : null
            );
        }

        if ($this->has('city')) {
            $city = trim((string) $this->input('city'));
            $payload['city'] = $city !== '' ? $city : null;
        }

        if ($this->has('state')) {
            $state = strtoupper(trim((string) $this->input('state')));
            $payload['state'] = $state !== '' ? $state : null;
        }

        $this->merge($payload);
    }

    public function rules(): array
    {
        $crawlAgency = $this->route('crawlAgency');

        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', Rule::unique(CrawlAgency::class, 'slug')->ignore($crawlAgency)],
            'base_url' => ['required', 'url:http,https', 'max:2048'],
            'root_domain' => ['required', 'string', 'max:255', Rule::unique(CrawlAgency::class, 'root_domain')->ignore($crawlAgency)],
            'city' => ['nullable', 'string', 'max:255'],
            'state' => ['nullable', 'string', 'size:2'],
        ];
    }
}
