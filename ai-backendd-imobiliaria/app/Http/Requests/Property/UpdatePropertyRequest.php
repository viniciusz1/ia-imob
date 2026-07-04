<?php

namespace App\Http\Requests\Property;

use App\Models\Property;
use App\Models\SystemEnum;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePropertyRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $property = $this->route('property');

        if (! $property instanceof Property) {
            $property = Property::query()->find((int) $property);
        }

        if (! $property) {
            return true;
        }

        return $this->user()?->can('update', $property) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $propertyId = $this->route('property')->id ?? $this->route('property');

        return [
            'reference_code' => [
                'sometimes',
                'required',
                'string',
                Rule::unique('properties', 'reference_code')->ignore($propertyId),
            ],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'property_type' => ['sometimes', 'required', 'string', $this->enumValueRule('property_types')],
            'purpose' => ['sometimes', 'required', 'string', $this->enumValueRule('property_purposes')],
            'status' => ['sometimes', 'required', 'string', $this->enumValueRule('property_statuses')],

            // Location
            'zip_code' => ['sometimes', 'required', 'string', 'max:20'],
            'state' => ['sometimes', 'required', 'string', 'max:2'],
            'city' => ['sometimes', 'required', 'string', 'max:100'],
            'neighborhood' => ['sometimes', 'required', 'string', 'max:100'],
            'street' => ['sometimes', 'required', 'string', 'max:255'],
            'number' => ['sometimes', 'required', 'string', 'max:20'],
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
            'build_year' => ['nullable', 'integer', 'min:1800', 'max:'.(date('Y') + 10)],

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
                'after_or_equal:today',
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

    private function enumValueRule(string $tag): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail) use ($tag) {
            $enumData = SystemEnum::query()->where('tag', $tag)->value('data');

            if (! is_array($enumData)) {
                $fail("Nao foi possivel validar {$attribute}: enum {$tag} nao configurado.");

                return;
            }

            $allowedValues = collect($enumData)
                ->pluck('value')
                ->filter(fn ($item) => is_string($item))
                ->values()
                ->all();

            if (! in_array($value, $allowedValues, true)) {
                $fail("O valor selecionado para {$attribute} e invalido.");
            }
        };
    }
}
