<?php

namespace App\Domain\Analytics;

/**
 * Rótulos dos tipos de imóvel vindos do inventário de leilões. Os tipos são
 * gravados em inglês pela ingestão e exibidos em português nos indicadores.
 */
final class AuctionPropertyType
{
    public const UNKNOWN = 'unknown';

    private const LABELS = [
        'house' => 'Casa',
        'apartment' => 'Apartamento',
        'land' => 'Terreno',
        'commercial' => 'Comercial',
        'rural' => 'Rural',
        self::UNKNOWN => 'Não classificado',
    ];

    public static function label(?string $type): string
    {
        return self::LABELS[$type ?? self::UNKNOWN] ?? self::LABELS[self::UNKNOWN];
    }

    /**
     * Converte rótulos escolhidos no filtro geral de volta para os valores
     * gravados, para que o mesmo filtro sirva mercado e leilões.
     *
     * @param  list<string>  $labels
     * @return list<string>
     */
    public static function valuesFor(array $labels): array
    {
        $normalized = array_map(self::normalize(...), $labels);

        return array_values(array_keys(array_filter(
            self::LABELS,
            static fn (string $label): bool => in_array(self::normalize($label), $normalized, true),
        )));
    }

    private static function normalize(string $value): string
    {
        $ascii = iconv('UTF-8', 'ASCII//TRANSLIT', $value);

        return mb_strtolower(trim($ascii === false ? $value : $ascii));
    }
}
