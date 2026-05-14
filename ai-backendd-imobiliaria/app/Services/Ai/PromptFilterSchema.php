<?php

namespace App\Services\Ai;

final class PromptFilterSchema
{
    private const VALID_TYPES = [
        'Apartamento',
        'Casa',
        'Cobertura',
        'Terreno',
        'Comercial',
        'Kitnet',
        'Studio',
        'Loft',
        'Sobrado',
        'Galpão',
        'Barracão',
        'Sala',
        'Sala Comercial',
        'Loja',
        'Ponto Comercial',
    ];

    private const VALID_RADIUS_HINTS = [
        'muito_perto',
        'perto',
        'regiao',
    ];

    private const VALID_SORTS = [
        'price_asc',
        'price_desc',
        'area_asc',
        'area_desc',
        'newest',
    ];

    private const VALID_COMODIDADES = [
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

    public static function definition(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'tipo' => [
                    'type' => 'array',
                    'items' => [
                        'type' => 'string',
                        'enum' => self::VALID_TYPES,
                    ],
                ],
                'locations' => [
                    'type' => 'array',
                    'items' => [
                        'type' => 'object',
                        'properties' => [
                            'bairro' => ['type' => 'string'],
                            'cidade' => ['type' => 'string'],
                        ],
                        'required' => ['cidade'],
                        'additionalProperties' => false,
                    ],
                ],
                'proximity' => [
                    'type' => 'object',
                    'properties' => [
                        'reference' => ['type' => 'string'],
                        'city' => ['type' => 'string'],
                        'radius_hint' => [
                            'type' => 'string',
                            'enum' => self::VALID_RADIUS_HINTS,
                        ],
                        'resolved' => ['type' => 'boolean'],
                    ],
                    'additionalProperties' => false,
                ],
                'bairro' => [
                    'type' => 'array',
                    'items' => ['type' => 'string'],
                ],
                'cidade' => [
                    'type' => 'array',
                    'items' => ['type' => 'string'],
                ],
                'imobiliaria' => [
                    'type' => 'array',
                    'items' => ['type' => 'string'],
                ],
                'quartos' => [
                    'type' => 'array',
                    'items' => ['type' => 'integer'],
                ],
                'quartos_plus' => ['type' => 'boolean'],
                'suites' => [
                    'type' => 'array',
                    'items' => ['type' => 'integer'],
                ],
                'suites_plus' => ['type' => 'boolean'],
                'banheiros' => [
                    'type' => 'array',
                    'items' => ['type' => 'integer'],
                ],
                'banheiros_plus' => ['type' => 'boolean'],
                'vagas' => [
                    'type' => 'array',
                    'items' => ['type' => 'integer'],
                ],
                'vagas_plus' => ['type' => 'boolean'],
                'min' => ['type' => 'integer'],
                'max' => ['type' => 'integer'],
                'comodidades' => [
                    'type' => 'array',
                    'items' => [
                        'type' => 'string',
                        'enum' => self::VALID_COMODIDADES,
                    ],
                ],
                'sort' => [
                    'type' => 'string',
                    'enum' => self::VALID_SORTS,
                ],
            ],
            'additionalProperties' => false,
        ];
    }

    public static function validTypes(): array
    {
        return self::VALID_TYPES;
    }

    public static function validRadiusHints(): array
    {
        return self::VALID_RADIUS_HINTS;
    }

    public static function validSorts(): array
    {
        return self::VALID_SORTS;
    }

    public static function validComodidades(): array
    {
        return self::VALID_COMODIDADES;
    }
}
