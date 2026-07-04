<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MarketPropertyResource extends JsonResource
{
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
            'quartos' => (int) $this->quartos ?: 0,
            'suites' => (int) $this->suites ?: 0,
            'banheiros' => (int) $this->banheiros ?: 0,
            'vagas' => (int) $this->vagas ?: 0,
            'area' => (float) $this->area ?: 0,
            'descricao' => $this->descricao ?: '',
            'link_imovel' => $this->link_imovel ?: '',
            'piscina' => (bool) $this->piscina,
            'churrasqueira' => (bool) $this->churrasqueira,
            'academia' => (bool) $this->academia,
            'salao_festas' => (bool) $this->salao_festas,
            'playground' => (bool) $this->playground,
            'sacada' => (bool) $this->sacada,
            'mobiliado' => (bool) $this->mobiliado,
            'ar_condicionado' => (bool) $this->ar_condicionado,
            'lavanderia' => (bool) $this->lavanderia,
            'escritorio' => (bool) $this->escritorio,
            'closet' => (bool) $this->closet,
            'elevador' => (bool) $this->elevador,
            'portaria_24h' => (bool) $this->portaria_24h,
            'aceita_permuta' => (bool) $this->aceita_permuta,
            'financiamento' => (bool) $this->financiamento,
            'andar' => $this->andar ?: '',
            'posicao_solar' => $this->posicao_solar ?: '',
            'ano_construcao' => (int) $this->ano_construcao ?: 0,
        ];
    }
}
