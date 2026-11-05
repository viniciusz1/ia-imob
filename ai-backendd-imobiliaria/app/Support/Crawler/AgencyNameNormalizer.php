<?php

namespace App\Support\Crawler;

use Illuminate\Support\Str;

class AgencyNameNormalizer
{
    private const KNOWN_CITIES = [
        'jaragua do sul',
        'joinville',
        'guaramirim',
        'schroeder',
        'blumenau',
        'itajai',
        'balneario camboriu',
        'florianopolis',
        'litoral catarinense',
        'vale do itajai',
        'santa catarina',
        'sc',
    ];

    private const GENERIC_TERMS = [
        'imobiliaria',
        'imoveis',
        'corretor',
        'corretora',
        'corretor de imoveis',
        'corretora de imoveis',
    ];

    public static function normalize(?string $name, ?string $city = null): string
    {
        if ($name === null || trim($name) === '') {
            return '';
        }

        // 1. Remove corporate legal suffixes: ltda, eireli, me, s/a, s.a.
        $cleaned = preg_replace('/\b(ltda|eireli|me|s\/?a)\b\.?/i', '', $name);

        // 2. Remove stylized quotes and apostrophes
        $cleaned = str_replace(["\xc2\xb4", '`', "'", '’'], '', (string) $cleaned);

        // 3. Delimiter split: | , - , — , – , or ' l ' / ' I ' (when used as pipe)
        $segments = preg_split('/\s+(?:[\|\-–—:]|\b[lI]\b)\s+/u', $cleaned);
        $primary = $segments[0] ?? $cleaned;

        // If primary segment is just a generic descriptor (e.g. "Imobiliária"), use next segment
        $asciiPrimary = strtolower(trim(Str::ascii($primary)));
        if (in_array($asciiPrimary, self::GENERIC_TERMS, true) && isset($segments[1])) {
            $primary = $segments[1];
        }

        // 4. Remove common taglines / marketing phrases
        $primary = preg_replace(
            '/\b(vendas?(\s+e\s+loca[cç][oõ]es)?|loca[cç][oõ]es|compra|aluguel|alugueis)\b.*/iu',
            '',
            (string) $primary
        );

        // 5. Convert to ASCII and collapse multiple spaces
        $primaryAscii = trim((string) preg_replace('/\s+/', ' ', Str::ascii((string) $primary)));

        // 6. Strip trailing city / state names (e.g. "Sollus Imobiliaria Jaragua do Sul" -> "Sollus Imobiliaria")
        $cities = self::KNOWN_CITIES;
        if ($city !== null && trim($city) !== '') {
            array_unshift($cities, strtolower(trim(Str::ascii($city))));
        }

        foreach ($cities as $c) {
            $pattern = '/\s+(?:em\s+)?'.preg_quote($c, '/').'(\s+sc)?\.?$/i';
            $withoutCity = trim((string) preg_replace($pattern, '', $primaryAscii));
            $asciiWithout = strtolower($withoutCity);
            if ($asciiWithout !== '' && ! in_array($asciiWithout, self::GENERIC_TERMS, true)) {
                $primaryAscii = $withoutCity;
            }
        }

        $primaryAscii = trim($primaryAscii, " \t\n\r\0\x0B.,-|/");

        if ($primaryAscii === '') {
            $primaryAscii = trim(Str::ascii($name));
        }

        return Str::title(strtolower($primaryAscii));
    }
}
