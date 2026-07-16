<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketProperty extends Model
{
    use HasFactory;

    public const UPDATED_AT = null;

    protected $table = 'crawler.market_properties';

    protected $fillable = [
        'crawler_run_id',
        'raw_property_id',
        'tipo',
        'imobiliaria',
        'valor',
        'bairro',
        'cidade',
        'imagem',
        'link_imovel',
        'descricao',
        'quartos',
        'suites',
        'banheiros',
        'vagas',
        'area',
        'aceita_permuta',
        'financiamento',
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
        'andar',
        'posicao_solar',
        'ano_construcao',
        'payload',
        'normalization_warnings',
        'extraction_trace',
    ];

    protected function casts(): array
    {
        return [
            'valor' => 'float',
            'area' => 'float',
            'quartos' => 'integer',
            'suites' => 'integer',
            'banheiros' => 'integer',
            'vagas' => 'integer',
            'ano_construcao' => 'integer',
            'aceita_permuta' => 'boolean',
            'financiamento' => 'boolean',
            'piscina' => 'boolean',
            'churrasqueira' => 'boolean',
            'academia' => 'boolean',
            'salao_festas' => 'boolean',
            'playground' => 'boolean',
            'sacada' => 'boolean',
            'mobiliado' => 'boolean',
            'ar_condicionado' => 'boolean',
            'lavanderia' => 'boolean',
            'escritorio' => 'boolean',
            'closet' => 'boolean',
            'elevador' => 'boolean',
            'portaria_24h' => 'boolean',
            'payload' => 'array',
            'normalization_warnings' => 'array',
            'extraction_trace' => 'array',
        ];
    }

    public function crawlerRun(): BelongsTo
    {
        return $this->belongsTo(CrawlerRun::class);
    }

    public function scopeLatestRun($query)
    {
        return $query->whereHas('crawlerRun', function ($q) {
            $q->where('technical_state', 'succeeded')
                ->where('publication_state', 'published');
        });
    }

    public function scopeApplyFilters($query, array $filters): void
    {
        if (! empty($filters['tipo'])) {
            $query->whereIn('tipo', (array) $filters['tipo']);
        }

        if (! empty($filters['bairro'])) {
            $query->whereIn('bairro', (array) $filters['bairro']);
        }

        if (! empty($filters['cidade'])) {
            $query->whereIn('cidade', (array) $filters['cidade']);
        }

        if (! empty($filters['imobiliaria'])) {
            $query->whereIn('imobiliaria', (array) $filters['imobiliaria']);
        }

        if (! empty($filters['locations'])) {
            $locations = array_values(array_filter((array) $filters['locations'], function ($location) {
                return is_array($location)
                    && (trim((string) ($location['bairro'] ?? '')) !== ''
                        || trim((string) ($location['cidade'] ?? '')) !== '');
            }));
            if (! empty($locations)) {
                $query->where(function ($q) use ($locations) {
                    foreach ($locations as $pair) {
                        $bairro = trim((string) ($pair['bairro'] ?? ''));
                        $cidade = trim((string) ($pair['cidade'] ?? ''));

                        if ($bairro === '' && $cidade === '') {
                            continue;
                        }

                        $q->orWhere(function ($p) use ($bairro, $cidade) {
                            if ($bairro !== '') {
                                $p->whereRaw('f_unaccent(bairro) ILIKE f_unaccent(?)', ['%'.$bairro.'%']);
                            }

                            if ($cidade !== '') {
                                $p->whereRaw('f_unaccent(cidade) ILIKE f_unaccent(?)', ['%'.$cidade.'%']);
                            }
                        });
                    }
                });
            }
        }

        if (! empty($filters['quartos']) || ! empty($filters['quartos_plus'])) {
            $query->where(function ($q) use ($filters) {
                if (! empty($filters['quartos'])) {
                    $quartos = array_map('intval', (array) $filters['quartos']);
                    $q->whereIn('quartos', $quartos);
                }
                if (! empty($filters['quartos_plus'])) {
                    $q->orWhere('quartos', '>=', 4);
                }
            });
        }

        if (! empty($filters['suites']) || ! empty($filters['suites_plus'])) {
            $query->where(function ($q) use ($filters) {
                if (! empty($filters['suites'])) {
                    $suites = array_map('intval', (array) $filters['suites']);
                    $q->whereIn('suites', $suites);
                }
                if (! empty($filters['suites_plus'])) {
                    $q->orWhere('suites', '>=', 4);
                }
            });
        }

        if (! empty($filters['banheiros']) || ! empty($filters['banheiros_plus'])) {
            $query->where(function ($q) use ($filters) {
                if (! empty($filters['banheiros'])) {
                    $banheiros = array_map('intval', (array) $filters['banheiros']);
                    $q->whereIn('banheiros', $banheiros);
                }
                if (! empty($filters['banheiros_plus'])) {
                    $q->orWhere('banheiros', '>=', 4);
                }
            });
        }

        if (! empty($filters['vagas']) || ! empty($filters['vagas_plus'])) {
            $query->where(function ($q) use ($filters) {
                if (! empty($filters['vagas'])) {
                    $vagas = array_map('intval', (array) $filters['vagas']);
                    $q->whereIn('vagas', $vagas);
                }
                if (! empty($filters['vagas_plus'])) {
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
            if (! empty($filters[$field])) {
                $query->where($field, true);
            }
        }

        if (! empty($filters['min'])) {
            $query->where('valor', '>=', $filters['min']);
        }

        if (! empty($filters['max'])) {
            $query->where('valor', '<=', $filters['max']);
        }

        if (! empty($filters['bairro_fuzzy']) || ! empty($filters['proximity_bairros'])) {
            $bairros = array_merge(
                (array) ($filters['bairro_fuzzy'] ?? []),
                (array) ($filters['proximity_bairros'] ?? [])
            );
            $query->where(function ($q) use ($bairros) {
                foreach ($bairros as $bairro) {
                    $q->orWhereRaw('f_unaccent(bairro) ILIKE f_unaccent(?)', ['%'.$bairro.'%']);
                }
            });
        }

        if (! empty($filters['proximity_cidade'])) {
            $query->whereRaw('f_unaccent(cidade) ILIKE f_unaccent(?)', ['%'.$filters['proximity_cidade'].'%']);
        }

        if (! empty($filters['cidade_fuzzy'])) {
            $cidades = (array) $filters['cidade_fuzzy'];
            $query->where(function ($q) use ($cidades) {
                foreach ($cidades as $cidade) {
                    $q->orWhereRaw('f_unaccent(cidade) ILIKE f_unaccent(?)', ['%'.$cidade.'%']);
                }
            });
        }

        if (! empty($filters['descricao'])) {
            $query->whereRaw('f_unaccent(descricao) ILIKE f_unaccent(?)', ['%'.$filters['descricao'].'%']);
        }
    }
}
