<?php

namespace Tests\Unit\Crawler;

use App\Services\Crawler\CityCatalog;
use App\Services\Crawler\NeighborhoodCatalog;
use PHPUnit\Framework\TestCase;

class CityAndNeighborhoodCatalogTest extends TestCase
{
    public function test_city_catalog_loads_without_collisions_and_resolves_aliases(): void
    {
        $entries = CityCatalog::entries();
        $this->assertGreaterThanOrEqual(42, count($entries));

        $this->assertSame('Jaraguá do Sul', CityCatalog::canonicalNameFor('jaragua do sul'));
        $this->assertSame('Jaraguá do Sul', CityCatalog::canonicalNameFor('jaragu---do-sul'));
        $this->assertSame('Balneário Barra do Sul', CityCatalog::canonicalNameFor('Barra do Sul'));
        $this->assertSame('Balneário Piçarras', CityCatalog::canonicalNameFor('Piçarras'));
        $this->assertSame('Guaramirim', CityCatalog::canonicalNameFor('Guaramirim - SC'));
        $this->assertSame('Schroeder', CityCatalog::canonicalNameFor('Schroeder/SC'));
    }

    public function test_neighborhood_catalog_covers_jaragua_and_15_closest_cities_without_collisions(): void
    {
        $entriesByCity = NeighborhoodCatalog::entries();

        $expectedCities = [
            'jaragua-do-sul',
            'guaramirim',
            'schroeder',
            'corupa',
            'massaranduba',
            'pomerode',
            'joinville',
            'sao-bento-do-sul',
            'rio-dos-cedros',
            'timbo',
            'campo-alegre',
            'araquari',
            'barra-velha',
            'blumenau',
            'balneario-barra-do-sul',
            'balneario-picarras',
            'penha',
        ];

        foreach ($expectedCities as $citySlug) {
            $this->assertArrayHasKey($citySlug, $entriesByCity, "Missing neighborhood preset for {$citySlug}");
            $this->assertNotEmpty($entriesByCity[$citySlug], "Empty neighborhood preset for {$citySlug}");
        }
    }

    public function test_neighborhood_catalog_resolves_canonical_names_across_closest_cities(): void
    {
        $this->assertSame('Rio Hern', NeighborhoodCatalog::canonicalNameFor('Casa no bairro Rio Hern', 'Schroeder'));
        $this->assertSame('Schroeder I', NeighborhoodCatalog::canonicalNameFor('Schroeder 1', 'Schroeder'));
        $this->assertSame('João Tozini', NeighborhoodCatalog::canonicalNameFor('Jão Tozini - Corupá/SC', 'Corupá'));
        $this->assertSame('Campinha', NeighborhoodCatalog::canonicalNameFor('Campinha', 'Massaranduba'));
        $this->assertSame('Testo Alto', NeighborhoodCatalog::canonicalNameFor('TESTO ALTO', 'Pomerode'));
        $this->assertSame('Costa e Silva', NeighborhoodCatalog::canonicalNameFor('Costa E Silva', 'Joinville'));
        $this->assertSame('Serra Alta', NeighborhoodCatalog::canonicalNameFor('Serra Alta', 'São Bento do Sul'));
        $this->assertSame('Tabuleiro', NeighborhoodCatalog::canonicalNameFor('TABULEIRO', 'Barra Velha'));
        $this->assertSame('Itacolomi', NeighborhoodCatalog::canonicalNameFor('Itacolumi', 'Balneário Piçarras'));
        $this->assertSame('Salinas', NeighborhoodCatalog::canonicalNameFor('Salinas', 'Balneário Barra do Sul'));
        $this->assertSame('Poço Grande', NeighborhoodCatalog::canonicalNameFor('Terreno Comercial, Poço Grande, GUARAMIRIM - SC', 'Guaramirim'));
        $this->assertSame('Ribeirão Cavalo', NeighborhoodCatalog::canonicalNameFor('Oportunidade para Sair do Aluguel - Bairro Ribeirão Cavalo', 'Jaraguá do Sul'));
    }
}
