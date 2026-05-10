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

        if ($request->filled('quartos') || $request->filled('quartos_plus')) {
            $query->where(function ($q) use ($request) {
                if ($request->filled('quartos')) {
                    $quartos = array_map('intval', (array) $request->input('quartos'));
                    $q->whereIn('quartos', $quartos);
                }
                if ($request->filled('quartos_plus')) {
                    $q->orWhere('quartos', '>=', 4);
                }
            });
        }

        if ($request->filled('suites') || $request->filled('suites_plus')) {
            $query->where(function ($q) use ($request) {
                if ($request->filled('suites')) {
                    $suites = array_map('intval', (array) $request->input('suites'));
                    $q->whereIn('suites', $suites);
                }
                if ($request->filled('suites_plus')) {
                    $q->orWhere('suites', '>=', 4);
                }
            });
        }

        if ($request->filled('banheiros') || $request->filled('banheiros_plus')) {
            $query->where(function ($q) use ($request) {
                if ($request->filled('banheiros')) {
                    $banheiros = array_map('intval', (array) $request->input('banheiros'));
                    $q->whereIn('banheiros', $banheiros);
                }
                if ($request->filled('banheiros_plus')) {
                    $q->orWhere('banheiros', '>=', 4);
                }
            });
        }

        if ($request->filled('vagas') || $request->filled('vagas_plus')) {
            $query->where(function ($q) use ($request) {
                if ($request->filled('vagas')) {
                    $vagas = array_map('intval', (array) $request->input('vagas'));
                    $q->whereIn('vagas', $vagas);
                }
                if ($request->filled('vagas_plus')) {
                    $q->orWhere('vagas', '>=', 4);
                }
            });
        }

        $boolFilters = [
            'piscina', 'churrasqueira', 'academia', 'salao_festas',
            'playground', 'sacada', 'mobiliado', 'ar_condicionado',
            'lavanderia', 'escritorio', 'closet', 'elevador',
            'portaria_24h', 'aceita_permuta', 'financiamento',
        ];

        foreach ($boolFilters as $field) {
            if ($request->filled($field)) {
                $query->where($field, true);
            }
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
