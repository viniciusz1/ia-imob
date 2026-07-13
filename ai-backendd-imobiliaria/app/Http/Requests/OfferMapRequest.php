<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class OfferMapRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'city' => ['required', 'string', 'max:255'],
            'tipo' => ['nullable', 'array'],
            'tipo.*' => ['string', 'max:255'],
            'quartos' => ['nullable', 'array'],
            'quartos.*' => ['integer', 'min:0'],
            'vagas' => ['nullable', 'array'],
            'vagas.*' => ['integer', 'min:0'],
            'min_price' => ['nullable', 'numeric', 'min:0'],
            'max_price' => ['nullable', 'numeric', 'min:0'],
            'min_area' => ['nullable', 'numeric', 'min:0'],
            'max_area' => ['nullable', 'numeric', 'min:0'],
            'layer' => ['nullable', 'string', 'in:stock,type,price,profile,concentration'],
            'concentration_type' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function filters(): array
    {
        $filters = [];

        if ($this->has('tipo')) {
            $filters['tipo'] = $this->input('tipo');
        }

        if ($this->has('quartos')) {
            $filters['quartos'] = $this->input('quartos');
        }

        if ($this->has('vagas')) {
            $filters['vagas'] = $this->input('vagas');
        }

        if ($this->filled('min_price')) {
            $filters['min'] = (float) $this->input('min_price');
        }

        if ($this->filled('max_price')) {
            $filters['max'] = (float) $this->input('max_price');
        }

        if ($this->filled('min_area')) {
            $filters['min_area'] = (float) $this->input('min_area');
        }

        if ($this->filled('max_area')) {
            $filters['max_area'] = (float) $this->input('max_area');
        }

        return $filters;
    }
}
