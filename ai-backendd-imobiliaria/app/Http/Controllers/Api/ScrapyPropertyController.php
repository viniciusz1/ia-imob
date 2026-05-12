<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ScrapyProperty;
use Illuminate\Http\Request;

class ScrapyPropertyController extends Controller
{
    public function index(Request $request)
    {
        $query = ScrapyProperty::query();

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
        ];

        $query->applyFilters($filters);

        if ($request->filled('ordem')) {
            $direction = strtolower($request->input('ordem')) === 'desc' ? 'desc' : 'asc';
            $query->orderBy('valor', $direction);
        } else {
            $query->orderBy('id', 'desc');
        }

        $perPage = $request->input('per_page', 20);
        $properties = $query->paginate($perPage);

        return \App\Http\Resources\Api\ScrapyPropertyResource::collection($properties);
    }

    public function filters()
    {
        $tipos = ScrapyProperty::whereNotNull('tipo')
            ->where('tipo', '!=', '')
            ->distinct()
            ->orderBy('tipo')
            ->pluck('tipo');

        $bairros = ScrapyProperty::whereNotNull('bairro')
            ->where('bairro', '!=', '')
            ->distinct()
            ->orderBy('bairro')
            ->pluck('bairro');

        $cidades = ScrapyProperty::whereNotNull('cidade')
            ->where('cidade', '!=', '')
            ->distinct()
            ->orderBy('cidade')
            ->pluck('cidade');

        $imobiliarias = ScrapyProperty::whereNotNull('imobiliaria')
            ->where('imobiliaria', '!=', '')
            ->distinct()
            ->orderBy('imobiliaria')
            ->pluck('imobiliaria');

        $quartos = ScrapyProperty::whereNotNull('quartos')
            ->where('quartos', '>', 0)
            ->distinct()
            ->orderBy('quartos')
            ->pluck('quartos');

        $suites = ScrapyProperty::whereNotNull('suites')
            ->where('suites', '>', 0)
            ->distinct()
            ->orderBy('suites')
            ->pluck('suites');

        $banheiros = ScrapyProperty::whereNotNull('banheiros')
            ->where('banheiros', '>', 0)
            ->distinct()
            ->orderBy('banheiros')
            ->pluck('banheiros');

        $vagas = ScrapyProperty::whereNotNull('vagas')
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
