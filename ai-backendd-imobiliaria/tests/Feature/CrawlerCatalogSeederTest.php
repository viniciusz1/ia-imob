<?php

namespace Tests\Feature;

use App\Models\Crawler\City;
use App\Models\Crawler\Neighborhood;
use App\Models\Crawler\PropertyType;
use Database\Seeders\CrawlerCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CrawlerCatalogSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeder_creates_jaragua_do_sul_city(): void
    {
        $this->seed(CrawlerCatalogSeeder::class);

        $this->assertTrue(
            City::where('slug', 'jaragua-do-sul')
                ->where('state', 'SC')
                ->exists()
        );
    }

    public function test_seeder_creates_neighborhoods(): void
    {
        $this->seed(CrawlerCatalogSeeder::class);

        $city = City::where('slug', 'jaragua-do-sul')->where('state', 'SC')->first();

        $this->assertInstanceOf(City::class, $city);
        $this->assertTrue(
            Neighborhood::where('city_id', $city->id)
                ->where('slug', 'centro')
                ->exists()
        );
        $this->assertTrue(
            Neighborhood::where('city_id', $city->id)
                ->where('slug', 'vila-lenzi')
                ->exists()
        );
    }

    public function test_seeder_creates_property_types(): void
    {
        $this->seed(CrawlerCatalogSeeder::class);

        $this->assertTrue(PropertyType::where('slug', 'apartamento')->exists());
        $this->assertTrue(PropertyType::where('slug', 'casa')->exists());
        $this->assertTrue(PropertyType::where('slug', 'sobrado')->exists());
        $this->assertTrue(PropertyType::where('slug', 'sobrado-geminado')->exists());
        $this->assertTrue(PropertyType::where('slug', 'geminado')->exists());
        $this->assertTrue(PropertyType::where('slug', 'terreno')->exists());
        $this->assertTrue(PropertyType::where('slug', 'sala-comercial')->exists());
    }
}
