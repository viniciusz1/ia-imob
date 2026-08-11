<?php

namespace Tests\Unit\Crawler;

use App\Services\Crawler\PropertyTypeCatalog;
use PHPUnit\Framework\TestCase;

class PropertyTypeCatalogTest extends TestCase
{
    public function test_catalog_has_canonical_types_and_requested_aliases_without_collisions(): void
    {
        $entries = PropertyTypeCatalog::entries();
        $bySlug = array_column($entries, null, 'slug');

        $this->assertCount(19, $entries);
        $this->assertContains('apartamento em condomínio', $bySlug['apartamento']['aliases']);
        $this->assertContains('apartamento penthouse', $bySlug['cobertura']['aliases']);
        $this->assertContains('kit-net', $bySlug['kitnet']['aliases']);
        $this->assertContains('estúdio residencial', $bySlug['studio']['aliases']);
        $this->assertContains('loft open-space', $bySlug['loft']['aliases']);
        $this->assertContains('casa térrea', $bySlug['casa']['aliases']);
        $this->assertContains('casa de 2 pavimentos', $bySlug['sobrado']['aliases']);
        $this->assertContains('casa parede-meia', $bySlug['geminado']['aliases']);
        $this->assertContains('lote urbanizado', $bySlug['terreno']['aliases']);
        $this->assertContains('commercial suite', $bySlug['sala-comercial']['aliases']);
        $this->assertContains('loja em strip mall', $bySlug['loja']['aliases']);
        $this->assertContains('estabelecimento comercial em funcionamento', $bySlug['ponto-comercial']['aliases']);
        $this->assertContains('centro logístico', $bySlug['galpao']['aliases']);
        $this->assertContains('prédio residencial inteiro', $bySlug['predio']['aliases']);
        $this->assertContains('imóvel comercial não especificado', $bySlug['imovel-comercial']['aliases']);
        $this->assertContains('propriedade de lazer tipo chácara', $bySlug['chacara']['aliases']);
        $this->assertContains('pequena propriedade tipo sítio', $bySlug['sitio']['aliases']);
        $this->assertContains('fazenda agropecuária produtiva', $bySlug['fazenda']['aliases']);
        $this->assertContains('imóvel rural não especificado', $bySlug['imovel-rural']['aliases']);
    }

    public function test_it_resolves_aliases_to_readable_canonical_names(): void
    {
        $this->assertSame(
            'Apartamento',
            PropertyTypeCatalog::canonicalNameFor('  APTO EM CONDOMÍNIO  '),
        );
        $this->assertSame('Galpão', PropertyTypeCatalog::canonicalNameFor('barracao'));
        $this->assertSame('Sala Comercial', PropertyTypeCatalog::canonicalNameFor('office-room'));
        $this->assertNull(PropertyTypeCatalog::canonicalNameFor('Millenium'));
    }
}
