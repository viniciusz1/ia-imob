<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\ScrapyPropertyResource;
use App\Services\AiPropertySearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiSearchController extends Controller
{
    public function search(Request $request, AiPropertySearchService $service): JsonResponse
    {
        $request->validate([
            'prompt' => ['required', 'string', 'max:500'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'sort' => ['sometimes', 'string', 'in:price_asc,price_desc,area_asc,area_desc,newest'],
            'context_city' => ['sometimes', 'nullable', 'string', 'max:100'],
            'filters' => ['sometimes', 'array'],
        ]);

        $prompt = $request->input('prompt');
        $perPage = $request->input('per_page', 20);
        $page = $request->input('page', 1);
        $sort = $request->input('sort');
        $contextCity = $request->input('context_city');

        try {
            $filters = $request->filled('filters')
                ? $request->input('filters')
                : $service->parsePrompt($prompt, $contextCity);
        } catch (\RuntimeException $e) {
            return response()->json([
                'message' => 'Não foi possível processar a busca por IA.',
                'error' => $e->getMessage(),
            ], 422);
        }

        $result = $service->search($filters, $perPage, $sort, $page);
        $properties = $result['properties'];

        return response()->json([
            'filters' => $result['filters'],
            'data' => ScrapyPropertyResource::collection($properties),
            'meta' => [
                'current_page' => $properties->currentPage(),
                'last_page' => $properties->lastPage(),
                'per_page' => $properties->perPage(),
                'total' => $properties->total(),
                'approximate' => $result['meta']['approximate'],
                'relaxed' => $result['meta']['relaxed'],
                'sort' => $result['meta']['sort'],
            ],
        ]);
    }
}
