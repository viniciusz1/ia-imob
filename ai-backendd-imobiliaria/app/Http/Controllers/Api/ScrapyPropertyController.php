<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ScrapyProperty;
use Illuminate\Http\Request;

class ScrapyPropertyController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = ScrapyProperty::query();

        if ($request->filled('tipo')) {
            $query->whereIn('tipo', (array) $request->input('tipo'));
        }

        if ($request->filled('bairro')) {
            $query->whereIn('bairro', (array) $request->input('bairro'));
        }

        if ($request->filled('cidade')) {
            $query->whereIn('cidade', (array) $request->input('cidade'));
        }

        if ($request->filled('imobiliaria')) {
            $query->whereIn('imobiliaria', (array) $request->input('imobiliaria'));
        }

        if ($request->filled('quartos')) {
            $quartos = array_map('intval', (array) $request->input('quartos'));
            $query->whereIn('qtd_quartos', $quartos);
        }

        if ($request->filled('min')) {
            $query->where('valor', '>=', $request->input('min'));
        }

        if ($request->filled('max')) {
            $query->where('valor', '<=', $request->input('max'));
        }

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

    /**
     * Get distinct values for filter options.
     */
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

        $quartos = ScrapyProperty::whereNotNull('qtd_quartos')
            ->where('qtd_quartos', '>', 0)
            ->distinct()
            ->orderBy('qtd_quartos')
            ->pluck('qtd_quartos');

        return response()->json([
            'tipos' => $tipos,
            'bairros' => $bairros,
            'cidades' => $cidades,
            'imobiliarias' => $imobiliarias,
            'quartos' => $quartos,
        ]);
    }
}
