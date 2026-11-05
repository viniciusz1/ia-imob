<?php

namespace App\Http\Requests\NewProperties;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Controla o acesso e valida os parâmetros da consulta de Novos Imóveis.
 */
class IndexNewPropertiesRequest extends FormRequest
{
    /**
     * Libera apenas usuários de uma Agência com a permissão de ver imóveis.
     * Administradores da plataforma não têm Agência e, por isso, recebem 403.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null
            && $user->agency_id !== null
            && $user->hasPermissionTo('properties.view');
    }

    /**
     * Valores fora destas regras são recusados com HTTP 422.
     * O per_page tem limite para ninguém pedir o inventário inteiro de uma vez.
     */
    public function rules(): array
    {
        return [
            'agency_id' => ['sometimes', 'integer', 'min:1'],
            'city' => ['sometimes', 'string', 'max:150'],
            'neighborhood' => ['sometimes', 'string', 'max:150'],
            'type' => ['sometimes', 'string', 'max:100'],
            'purpose' => ['sometimes', 'in:venda,locacao'],
            'flag' => ['sometimes', 'in:all,new,opportunity,both'],
            'search' => ['sometimes', 'string', 'max:200'],
            'bedrooms' => ['sometimes', 'in:1,2,3,4,5+'],
            'bathrooms' => ['sometimes', 'in:1,2,3,4,5+'],
            'parking' => ['sometimes', 'in:1,2,3,4,5+'],
            'sort' => ['sometimes', 'in:identified_desc,identified_asc,opportunity_desc'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ];
    }
}
