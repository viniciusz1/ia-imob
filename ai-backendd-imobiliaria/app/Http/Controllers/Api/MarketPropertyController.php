<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\MarketSearchAllowanceExceeded;
use App\Exceptions\UserMarketSearchLimitExceeded;
use App\Http\Controllers\Controller;
use App\Http\Resources\Api\MarketPropertyResource;
use App\Models\MarketProperty;
use App\Services\Crawler\CityCatalog;
use App\Services\Crawler\NeighborhoodCatalog;
use App\Services\Crawler\PropertyTypeCatalog;
use App\Services\MarketSearchQuotaService;
use App\Services\UserMarketSearchService;
use Illuminate\Http\Request;

class MarketPropertyController extends Controller
{
    private const BOOL_FILTERS = [
        'piscina',
        'churrasqueira',
        'academia',
        'salao_festas',
        'playground',
        'sacada',
        'mobiliado',
        'ar_condicionado',
        'lavanderia',
        'escritorio',
        'closet',
        'elevador',
        'portaria_24h',
        'aceita_permuta',
        'financiamento',
    ];

    public function index(Request $request, MarketSearchQuotaService $quota)
    {
        $request->validate([
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:48'],
        ]);

        $agency = $request->user()?->agency;
        abort_if($agency === null, 403, 'O IA Searcher exige uma Agência.');

        try {
            return $quota->execute($agency, fn () => app(UserMarketSearchService::class)->execute($request->user(), 'filters', $request->query(), function () use ($request) {
                $query = MarketProperty::query()->latestRun()->allowedForAgency($request->user()->agency)->with(['crawlerRun.crawlAgency']);

                $query->applyFilters($this->extractFilters($request));

                if ($request->filled('sort')) {
                    match ($request->input('sort')) {
                        'price_asc' => $query->orderBy('valor', 'asc')->orderBy('id', 'desc'),
                        'price_desc' => $query->orderBy('valor', 'desc')->orderBy('id', 'desc'),
                        'area_asc' => $query->orderBy('area', 'asc')->orderBy('id', 'desc'),
                        'area_desc' => $query->orderBy('area', 'desc')->orderBy('id', 'desc'),
                        default => $query->orderBy('id', 'desc'),
                    };
                } elseif ($request->filled('ordem')) {
                    $direction = strtolower($request->input('ordem')) === 'desc' ? 'desc' : 'asc';
                    $query->orderBy('valor', $direction);
                } else {
                    $query->orderBy('id', 'desc');
                }

                $perPage = $request->integer('per_page', 48);
                $properties = $query->paginate($perPage);

                return MarketPropertyResource::collection($properties)->response();
            }));
        } catch (MarketSearchAllowanceExceeded $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
                'code' => 'market_search_allowance_exhausted',
                'allowance' => $exception->allowance,
            ], 429);
        } catch (UserMarketSearchLimitExceeded $exception) {
            return response()->json(['code' => 'user_market_search_daily_limit_exhausted', 'message' => $exception->getMessage(), 'allowance' => $exception->allowance], 429);
        }
    }

    public function filters(?Request $request = null)
    {
        $request ??= request();
        $agency = ($request->user() ?? auth()->user())?->agency;
        abort_if($agency === null, 403, 'O IA Searcher exige uma Agência.');
        $activeFilters = $this->extractFilters($request);

        $queryExcluding = function (array $excludedKeys) use ($activeFilters, $agency) {
            $scopedFilters = array_diff_key($activeFilters, array_flip($excludedKeys));

            return MarketProperty::query()
                ->latestRun()
                ->allowedForAgency($agency)
                ->applyFilters($scopedFilters);
        };

        $tipos = $queryExcluding(['tipo'])
            ->whereNotNull('tipo')
            ->where('tipo', '!=', '')
            ->whereIn('tipo', array_column(PropertyTypeCatalog::entries(), 'name'))
            ->distinct()
            ->orderBy('tipo')
            ->pluck('tipo');

        $cidades = $queryExcluding(['cidade'])
            ->whereNotNull('cidade')
            ->where('cidade', '!=', '')
            ->distinct()
            ->orderBy('cidade')
            ->pluck('cidade')
            ->map(fn ($cidade) => CityCatalog::canonicalNameFor((string) $cidade))
            ->filter()
            ->unique()
            ->sort()
            ->values();

        $bairrosQuery = $queryExcluding(['bairro']);

        $bairrosPorCidade = (clone $bairrosQuery)
            ->whereNotNull('cidade')
            ->where('cidade', '!=', '')
            ->whereNotNull('bairro')
            ->where('bairro', '!=', '')
            ->select(['cidade', 'bairro'])
            ->distinct()
            ->orderBy('cidade')
            ->orderBy('bairro')
            ->get()
            ->map(function ($property): ?array {
                $cidade = CityCatalog::canonicalNameFor((string) $property->cidade);
                $rawBairro = trim((string) $property->bairro);

                if ($cidade === null || CityCatalog::isInvalidLocationValue($rawBairro) || NeighborhoodCatalog::isInvalidLocationValue($rawBairro)) {
                    return null;
                }

                $hasCityCatalog = NeighborhoodCatalog::hasCatalogFor($cidade);
                $canonicalBairro = NeighborhoodCatalog::canonicalNameFor($rawBairro, $cidade);

                if ($canonicalBairro !== null) {
                    $bairro = $canonicalBairro;
                } elseif (! $hasCityCatalog) {
                    $bairro = $rawBairro;
                } else {
                    return null;
                }

                return [
                    'cidade' => $cidade,
                    'bairro' => $bairro,
                ];
            })
            ->filter()
            ->groupBy('cidade')
            ->sortKeys()
            ->map(fn ($properties) => $properties->pluck('bairro')->unique()->sort()->values());

        $bairros = $bairrosPorCidade->flatten()->unique()->sort()->values();

        $imobiliarias = $queryExcluding(['imobiliaria'])
            ->join('crawler.crawl_runs as run', 'run.id', '=', 'crawler.market_properties.crawler_run_id')
            ->join('crawler.crawl_agencies as agency', 'agency.id', '=', 'run.crawl_agency_id')
            ->whereNotNull('agency.name')
            ->where('agency.name', '!=', '')
            ->distinct()
            ->orderBy('agency.name')
            ->pluck('agency.name');

        $quartos = $queryExcluding(['quartos', 'quartos_plus'])
            ->whereNotNull('quartos')
            ->where('quartos', '>', 0)
            ->distinct()
            ->orderBy('quartos')
            ->pluck('quartos');

        $suites = $queryExcluding(['suites', 'suites_plus'])
            ->whereNotNull('suites')
            ->where('suites', '>', 0)
            ->distinct()
            ->orderBy('suites')
            ->pluck('suites');

        $banheiros = $queryExcluding(['banheiros', 'banheiros_plus'])
            ->whereNotNull('banheiros')
            ->where('banheiros', '>', 0)
            ->distinct()
            ->orderBy('banheiros')
            ->pluck('banheiros');

        $vagas = $queryExcluding(['vagas', 'vagas_plus'])
            ->whereNotNull('vagas')
            ->where('vagas', '>', 0)
            ->distinct()
            ->orderBy('vagas')
            ->pluck('vagas');

        $comodidadesSelect = implode(', ', array_map(
            static fn (string $field): string => "BOOL_OR({$field}) as {$field}",
            self::BOOL_FILTERS,
        ));
        $comodidadesRow = (array) ($queryExcluding([])
            ->selectRaw($comodidadesSelect)
            ->toBase()
            ->first() ?? []);

        $comodidades = array_values(array_filter(
            self::BOOL_FILTERS,
            static fn (string $field): bool => ! empty($comodidadesRow[$field]),
        ));

        return response()->json([
            'tipos' => $tipos,
            'bairros' => $bairros,
            'bairros_por_cidade' => $bairrosPorCidade,
            'cidades' => $cidades,
            'imobiliarias' => $imobiliarias,
            'quartos' => $quartos,
            'suites' => $suites,
            'banheiros' => $banheiros,
            'vagas' => $vagas,
            'comodidades' => $comodidades,
        ]);
    }

    private function extractFilters(Request $request): array
    {
        $comodidades = array_values(array_filter(array_map('strval', (array) $request->input('comodidade', []))));

        $filters = [
            'tipo' => $request->input('tipo'),
            'bairro' => $request->input('bairro'),
            'cidade' => $request->input('cidade'),
            'imobiliaria' => $request->input('imobiliaria'),
            'quartos' => $request->input('quartos'),
            'quartos_plus' => $request->boolean('quartos_plus'),
            'suites' => $request->input('suites'),
            'suites_plus' => $request->boolean('suites_plus'),
            'banheiros' => $request->input('banheiros'),
            'banheiros_plus' => $request->boolean('banheiros_plus'),
            'vagas' => $request->input('vagas'),
            'vagas_plus' => $request->boolean('vagas_plus'),
            'min' => $request->input('min'),
            'max' => $request->input('max'),
            'area_min' => $request->input('area_min'),
            'area_max' => $request->input('area_max'),
            'data_inicio' => $request->input('data_inicio'),
            'data_fim' => $request->input('data_fim'),
            'descricao' => $request->input('descricao'),
        ];

        foreach (self::BOOL_FILTERS as $field) {
            $filters[$field] = $request->boolean($field) || in_array($field, $comodidades, true);
        }

        return $filters;
    }
}
