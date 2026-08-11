<?php

namespace Database\Seeders;

use App\Services\Crawler\PropertyTypeCatalog;
use Illuminate\Database\Seeder;

class CrawlerPropertyTypeSeeder extends Seeder
{
    public function run(): void
    {
        PropertyTypeCatalog::synchronize();
    }
}
