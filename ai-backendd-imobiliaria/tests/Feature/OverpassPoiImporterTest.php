<?php

namespace Tests\Feature;

use App\Models\NeighborhoodReferencePoint;
use App\Models\PointOfInterest;
use App\Services\Overpass\OverpassPoiImporter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class OverpassPoiImporterTest extends TestCase
{
    use RefreshDatabase;

    public function test_importer_persists_pois_and_neighborhood_reference_points(): void
    {
        Http::fake([
            '*overpass-api.de/*' => Http::response([
                'elements' => [
                    [
                        'type' => 'node',
                        'id' => 1001,
                        'lat' => -26.4851,
                        'lon' => -49.0664,
                        'tags' => [
                            'name' => 'WEG',
                            'office' => 'company',
                        ],
                    ],
                    [
                        'type' => 'way',
                        'id' => 2001,
                        'center' => [
                            'lat' => -26.4866,
                            'lon' => -49.0711,
                        ],
                        'tags' => [
                            'name' => 'Centro',
                            'place' => 'neighbourhood',
                        ],
                    ],
                ],
            ]),
        ]);

        $summary = app(OverpassPoiImporter::class)->import('Jaraguá do Sul', 'SC');

        $this->assertSame(1, $summary['pois']);
        $this->assertSame(1, $summary['neighborhoods']);
        $this->assertDatabaseHas('points_of_interest', [
            'name' => 'WEG',
            'category' => 'industry',
            'city' => 'Jaraguá do Sul',
            'state' => 'SC',
        ]);
        $this->assertDatabaseHas('neighborhood_reference_points', [
            'name' => 'Centro',
            'city' => 'Jaraguá do Sul',
            'state' => 'SC',
        ]);

        $this->assertContains('weg', PointOfInterest::firstOrFail()->aliases);
        $this->assertContains('bairro centro', NeighborhoodReferencePoint::firstOrFail()->aliases);
    }
}
