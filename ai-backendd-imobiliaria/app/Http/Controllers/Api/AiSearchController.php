<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\MarketSearchAllowanceExceeded;
use App\Http\Controllers\Controller;
use App\Http\Resources\Api\MarketPropertyResource;
use App\Services\AiPropertySearchService;
use App\Services\MarketSearchQuotaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiSearchController extends Controller
{
    public function search(
        Request $request,
        AiPropertySearchService $service,
        MarketSearchQuotaService $quota,
    ): JsonResponse {
        $request->validate([
            'prompt' => ['required', 'string', 'max:500'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:21'],
            'sort' => ['sometimes', 'string', 'in:price_asc,price_desc,area_asc,area_desc,newest'],
            'context_city' => ['sometimes', 'nullable', 'string', 'max:100'],
            'filters' => ['sometimes', 'array'],
        ]);

        $prompt = $request->input('prompt');
        $perPage = $request->integer('per_page', 21);
        $page = $request->integer('page', 1);
        $sort = $request->input('sort');
        $contextCity = $request->input('context_city');

        $agency = $request->user()?->agency;
        abort_if($agency === null, 403, 'O IA Searcher exige uma Agência.');

        try {
            return $quota->execute($agency, function () use (
                $request,
                $service,
                $prompt,
                $contextCity,
                $perPage,
                $sort,
                $page,
            ): JsonResponse {
                $filters = $request->filled('filters')
                    ? $service->normalizeParsedFilters($request->input('filters'), $contextCity)
                    : $service->parsePrompt($prompt, $contextCity);

                $result = $service->search($filters, $perPage, $sort, $page);
                $properties = $result['properties'];

                return response()->json([
                    'filters' => $result['filters'],
                    'data' => MarketPropertyResource::collection($properties),
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
            });
        } catch (MarketSearchAllowanceExceeded $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
                'code' => 'market_search_allowance_exhausted',
                'allowance' => $exception->allowance,
            ], 429);
        } catch (\RuntimeException $e) {
            return response()->json([
                'message' => 'Não foi possível processar a busca por IA.',
                'error' => $e->getMessage(),
            ], 422);
        }
    }
}
