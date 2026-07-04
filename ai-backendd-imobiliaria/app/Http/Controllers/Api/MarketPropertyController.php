<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MarketProperty;
use Illuminate\Http\Request;

class MarketPropertyController extends Controller
{
    public function index(Request $request)
    {
        $query = MarketProperty::query()->latestRun();

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

        $perPage = $request->input('per_page', 20);
        $properties = $query->paginate($perPage);

        return \App\Http\Resources\Api\MarketPropertyResource::collection($properties);
    }

    public function filters()
    {
        $baseQuery = MarketProperty::query()->latestRun();

        $tipos = (clone $baseQuery)
            ->whereNotNull('tipo')
            ->where('tipo', '!=', '')
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

        $imobiliarias = (clone $baseQuery)
            ->whereNotNull('imobiliaria')
            ->where('imobiliaria', '!=', '')
            ->distinct()
            ->orderBy('imobiliaria')
            ->pluck('imobiliaria');

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
            'cidades' => $cidades,
            'imobiliarias' => $imobiliarias,
            'quartos' => $quartos,
            'suites' => $suites,
            'banheiros' => $banheiros,
            'vagas' => $vagas,
        ]);
    }
}
