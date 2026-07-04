<?php

namespace App\Http\Requests\Property;

use App\Models\Property;
use Illuminate\Foundation\Http\FormRequest;

class ShowPropertyRequest extends FormRequest
{
    public function authorize(): bool
    {
        $property = $this->route('property');

        if (! $property instanceof Property) {
            $property = Property::query()->find((int) $property);
        }

        if (! $property) {
            return true;
        }

        return $this->user()?->can('view', $property) ?? false;
    }

    public function rules(): array
    {
        return [];
    }
}
