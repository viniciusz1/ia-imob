<?php

namespace Tests\Unit\Crawler;

use App\Support\Crawler\AgencyNameNormalizer;
use PHPUnit\Framework\TestCase;

class AgencyNameNormalizerTest extends TestCase
{
    public function test_normalizes_example_from_user_request(): void
    {
        $input = 'IMOB Imóveis | Imobiliária em Jaraguá do Sul';
        $this->assertSame('Imob Imoveis', AgencyNameNormalizer::normalize($input));
    }

    public function test_normalizes_all_caps_and_mixed_case_to_title_case(): void
    {
        $this->assertSame('Imobiliaria Smart', AgencyNameNormalizer::normalize('Imobiliária SMART'));
        $this->assertSame('Splendore Imoveis', AgencyNameNormalizer::normalize('SPLENDORE IMÓVEIS'));
        $this->assertSame('Haus Imoveis', AgencyNameNormalizer::normalize('HAUS Imóveis'));
        $this->assertSame('Macro Imoveis', AgencyNameNormalizer::normalize('MACRO imóveis'));
        $this->assertSame('M2 Imoveis', AgencyNameNormalizer::normalize('M2 Imóveis'));
        $this->assertSame('Imobiliaria 636', AgencyNameNormalizer::normalize('Imobiliária 636'));
    }

    public function test_strips_separators_and_location_or_seo_subtitles(): void
    {
        $this->assertSame('D2 Imoveis', AgencyNameNormalizer::normalize('D2 Imóveis | Imobiliária em Jaraguá do Sul'));
        $this->assertSame('Berta Imoveis', AgencyNameNormalizer::normalize('Berta Imóveis l Imobiliária em Jaraguá do Sul'));
        $this->assertSame('Triangulo Imoveis', AgencyNameNormalizer::normalize('Triângulo Imóveis | Imobiliária Joinville'));
        $this->assertSame('Eskala Imoveis', AgencyNameNormalizer::normalize('Eskala Imóveis - Guaramirim'));
        $this->assertSame('Boaretto Imoveis', AgencyNameNormalizer::normalize('Boaretto Imóveis - Imobiliária Joinville'));
        $this->assertSame('H7 Imoveis', AgencyNameNormalizer::normalize('H7 Imóveis - Imobiliária Joinville Aluguel'));
    }

    public function test_strips_trailing_city_without_separator_when_agency_name_remains(): void
    {
        $this->assertSame('Sollus Imobiliaria', AgencyNameNormalizer::normalize('Sollus Imobiliária Jaraguá do Sul'));
        $this->assertSame('Imobiliaria Borba', AgencyNameNormalizer::normalize('Imobiliária Borba Joinville'));
    }

    public function test_preserves_city_when_stripping_would_leave_only_generic_descriptor(): void
    {
        $this->assertSame('Imobiliaria Joinville', AgencyNameNormalizer::normalize('Imobiliária Joinville', 'Joinville'));
        $this->assertSame('Imobiliaria Jaragua', AgencyNameNormalizer::normalize('IMOBILIÁRIA JARAGUÁ - Venda de Apartamentos e Casas em Jaraguá do Sul e Região'));
    }

    public function test_skips_generic_prefix_when_followed_by_branded_segment(): void
    {
        $this->assertSame(
            'Suprema Imoveis Selecionados',
            AgencyNameNormalizer::normalize('Imobiliária - Suprema Imóveis Selecionados - Joinville Sc')
        );
        $this->assertSame(
            'Luiz Gonzaga',
            AgencyNameNormalizer::normalize('Corretor de Imóveis - Luiz Gonzaga')
        );
    }

    public function test_strips_corporate_suffixes(): void
    {
        $this->assertSame('Chaluzim Imoveis', AgencyNameNormalizer::normalize('Chaluzim imóveis ltda'));
    }

    public function test_handles_apostrophes_and_smart_quotes(): void
    {
        $this->assertSame('Styllus Imoveis', AgencyNameNormalizer::normalize('Styllu´S Imóveis'));
    }

    public function test_handles_empty_and_null_values(): void
    {
        $this->assertSame('', AgencyNameNormalizer::normalize(null));
        $this->assertSame('', AgencyNameNormalizer::normalize('   '));
    }
}
