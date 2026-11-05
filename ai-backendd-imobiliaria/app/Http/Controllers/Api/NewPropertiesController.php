<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\NewProperties\IndexNewPropertiesRequest;
use App\Http\Resources\NewProperties\NewPropertyAgencyResource;
use App\Services\NewProperties\NewPropertiesQueryService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Endpoint GET /api/v1/new-properties, consumido pela tela de Novos Imóveis.
 * Contrato completo em docs/contexts/new-properties/API.md.
 */
class NewPropertiesController extends Controller
{
    public function __invoke(
        IndexNewPropertiesRequest $request,
        NewPropertiesQueryService $service,
    ): AnonymousResourceCollection {
        // Valores padrão, substituídos pelos parâmetros já validados da requisição.
        $result = $service->get([
            'page' => 1,
            'per_page' => 24,
            'sort' => 'identified_desc',
            ...$request->validated(),
        ]);

        return NewPropertyAgencyResource::collection($result['groups'])
            ->additional(['meta' => $result['meta']]);
    }
}
