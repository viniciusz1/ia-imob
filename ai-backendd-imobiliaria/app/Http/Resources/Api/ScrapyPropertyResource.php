<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ScrapyPropertyResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'image' => $this->imagem ?: '',
            'tipo' => $this->tipo ?: '',
            'preco' => (float) $this->valor ?: 0,
            'bairro' => $this->bairro ?: '',
            'cidade' => $this->cidade ?: '',
            'imobiliaria' => $this->imobiliaria ?: '',
            'quartos' => (int) $this->qtd_quartos ?: 0,
            'areaPrivativa' => (float) $this->area_m2 ?: 0,
            'descricao' => $this->descricao ?: '',
            'link_imovel' => $this->link_imovel ?: '',
        ];
    }
}
