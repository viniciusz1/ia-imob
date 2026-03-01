<?php

namespace App\Http\Requests\Property;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePropertyRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization handled by middleware/policy
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'reference_code' => ['required', 'string', 'unique:properties,reference_code'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'property_type' => ['required', 'string'],
            'purpose' => ['required', 'string'],
            'status' => ['required', 'string'],

            // Location
            'zip_code' => ['required', 'string', 'max:20'],
            'state' => ['required', 'string', 'max:2'],
            'city' => ['required', 'string', 'max:100'],
            'neighborhood' => ['required', 'string', 'max:100'],
            'street' => ['required', 'string', 'max:255'],
            'number' => ['required', 'string', 'max:20'],
            'complement' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
            'show_exact_address' => ['sometimes', 'boolean'],

            // Pricing
            'sale_price' => ['nullable', 'numeric', 'min:0'],
            'rent_price' => ['nullable', 'numeric', 'min:0'],
            'property_tax' => ['nullable', 'numeric', 'min:0'],
            'condo_fee' => ['nullable', 'numeric', 'min:0'],
            'accepts_financing' => ['sometimes', 'boolean'],
            'accepts_exchange' => ['sometimes', 'boolean'],
            'show_price' => ['sometimes', 'boolean'],

            // Characteristics
            'usable_area' => ['nullable', 'numeric', 'min:0'],
            'total_area' => ['nullable', 'numeric', 'min:0'],
            'bedrooms' => ['sometimes', 'integer', 'min:0'],
            'suites' => ['sometimes', 'integer', 'min:0'],
            'bathrooms' => ['sometimes', 'integer', 'min:0'],
            'garage_spaces' => ['sometimes', 'integer', 'min:0'],
            'floor_number' => ['nullable', 'integer'],
            'total_floors' => ['nullable', 'integer'],
            'build_year' => ['nullable', 'integer', 'min:1800', 'max:' . (date('Y') + 10)],

            // Media
            'video_url' => ['nullable', 'url', 'max:255'],
            'virtual_tour_url' => ['nullable', 'url', 'max:255'],

            // Internal Management
            'broker_id' => ['nullable', 'exists:users,id'],
            'owner_id' => ['nullable', 'exists:users,id'],
            'internal_notes' => ['nullable', 'string'],
            'has_exclusive_right' => ['sometimes', 'boolean'],
            'exclusive_right_expiration_date' => [
                'required_if:has_exclusive_right,true',
                'nullable',
                'date',
                'after_or_equal:today'
            ],
            'keys_location' => ['nullable', 'string', 'max:255'],

            // Publication
            'is_published' => ['sometimes', 'boolean'],
            'is_highlighted' => ['sometimes', 'boolean'],

            // Relationships
            'features' => ['sometimes', 'array'],
            'features.*' => ['exists:features,id'],
        ];
    }
}
