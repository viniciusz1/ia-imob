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
        ]);

        $prompt = $request->input('prompt');
        $perPage = $request->input('per_page', 20);

        try {
            $filters = $service->parsePrompt($prompt);
        } catch (\RuntimeException $e) {
            return response()->json([
                'message' => 'Não foi possível processar a busca por IA.',
                'error' => $e->getMessage(),
            ], 422);
        }

        $properties = $service->search($filters, $perPage);

        return response()->json([
            'filters' => $filters,
            'data' => ScrapyPropertyResource::collection($properties),
            'meta' => [
                'current_page' => $properties->currentPage(),
                'last_page' => $properties->lastPage(),
                'per_page' => $properties->perPage(),
                'total' => $properties->total(),
            ],
        ]);
    }
}
