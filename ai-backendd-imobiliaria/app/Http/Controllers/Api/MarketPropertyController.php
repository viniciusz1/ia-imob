<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\MarketSearchAllowanceExceeded;
use App\Http\Controllers\Controller;
use App\Http\Resources\Api\MarketPropertyResource;
use App\Models\MarketProperty;
use App\Services\Crawler\PropertyTypeCatalog;
use App\Services\MarketSearchQuotaService;
use Illuminate\Http\Request;

class MarketPropertyController extends Controller
{
    public function index(Request $request, MarketSearchQuotaService $quota)
    {
        $request->validate([
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:21'],
        ]);

        $agency = $request->user()?->agency;
        abort_if($agency === null, 403, 'O IA Searcher exige uma Agência.');

        try {
            return $quota->execute($agency, function () use ($request) {
                $query = MarketProperty::query()->latestRun()->with(['crawlerRun.crawlAgency']);

                $filters = [
                    'tipo' => $request->input('tipo'),
                    'bairro' => $request->input('bairro'),
                    'cidade' => $request->input('cidade'),
                    'imobiliaria' => $request->input('imobiliaria'),
                    'quartos' => $request->input('quartos'),
                    'quartos_plus' => $request->filled('quartos_plus'),
                    'suites' => $request->input('suites'),
                    'suites_plus' => $request->filled('suites_plus'),
                    'banheiros' => $request->input('banheiros'),
                    'banheiros_plus' => $request->filled('banheiros_plus'),
                    'vagas' => $request->input('vagas'),
                    'vagas_plus' => $request->filled('vagas_plus'),
                    'piscina' => $request->filled('piscina'),
                    'churrasqueira' => $request->filled('churrasqueira'),
                    'academia' => $request->filled('academia'),
                    'salao_festas' => $request->filled('salao_festas'),
                    'playground' => $request->filled('playground'),
                    'sacada' => $request->filled('sacada'),
                    'mobiliado' => $request->filled('mobiliado'),
                    'ar_condicionado' => $request->filled('ar_condicionado'),
                    'lavanderia' => $request->filled('lavanderia'),
                    'escritorio' => $request->filled('escritorio'),
                    'closet' => $request->filled('closet'),
                    'elevador' => $request->filled('elevador'),
                    'portaria_24h' => $request->filled('portaria_24h'),
                    'aceita_permuta' => $request->filled('aceita_permuta'),
                    'financiamento' => $request->filled('financiamento'),
                    'min' => $request->input('min'),
                    'max' => $request->input('max'),
                    'descricao' => $request->input('descricao'),
                ];

                $query->applyFilters($filters);

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

                $perPage = $request->integer('per_page', 20);
                $properties = $query->paginate($perPage);

                return MarketPropertyResource::collection($properties)->response();
            });
        } catch (MarketSearchAllowanceExceeded $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
                'code' => 'market_search_allowance_exhausted',
                'allowance' => $exception->allowance,
            ], 429);
        }
    }

    public function filters()
    {
        $baseQuery = MarketProperty::query()->latestRun();

        $tipos = (clone $baseQuery)
            ->whereNotNull('tipo')
            ->where('tipo', '!=', '')
            ->whereIn('tipo', array_column(PropertyTypeCatalog::entries(), 'name'))
            ->distinct()
            ->orderBy('tipo')
            ->pluck('tipo');

        $bairros = (clone $baseQuery)
            ->whereNotNull('bairro')
            ->where('bairro', '!=', '')
            ->distinct()
            ->orderBy('bairro')
            ->pluck('bairro');

        $cidades = (clone $baseQuery)
            ->whereNotNull('cidade')
            ->where('cidade', '!=', '')
            ->distinct()
            ->orderBy('cidade')
            ->pluck('cidade');

        $bairrosPorCidade = (clone $baseQuery)
            ->whereNotNull('cidade')
            ->where('cidade', '!=', '')
            ->whereNotNull('bairro')
            ->where('bairro', '!=', '')
            ->select(['cidade', 'bairro'])
            ->distinct()
            ->orderBy('cidade')
            ->orderBy('bairro')
            ->get()
            ->groupBy('cidade')
            ->map(fn ($properties) => $properties->pluck('bairro')->values());

        $imobiliarias = (clone $baseQuery)
            ->join('crawler.crawl_runs as run', 'run.id', '=', 'crawler.market_properties.crawler_run_id')
            ->join('crawler.crawl_agencies as agency', 'agency.id', '=', 'run.crawl_agency_id')
            ->whereNotNull('agency.name')
            ->where('agency.name', '!=', '')
            ->distinct()
            ->orderBy('agency.name')
            ->pluck('agency.name');

        $quartos = (clone $baseQuery)
            ->whereNotNull('quartos')
            ->where('quartos', '>', 0)
            ->distinct()
            ->orderBy('quartos')
            ->pluck('quartos');

        $suites = (clone $baseQuery)
            ->whereNotNull('suites')
            ->where('suites', '>', 0)
            ->distinct()
            ->orderBy('suites')
            ->pluck('suites');

        $banheiros = (clone $baseQuery)
            ->whereNotNull('banheiros')
            ->where('banheiros', '>', 0)
            ->distinct()
            ->orderBy('banheiros')
            ->pluck('banheiros');

        $vagas = (clone $baseQuery)
            ->whereNotNull('vagas')
            ->where('vagas', '>', 0)
            ->distinct()
            ->orderBy('vagas')
            ->pluck('vagas');

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
        ]);
    }
}
