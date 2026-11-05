<?php

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\Prospect;
use App\Support\Crawler\AgencyNameNormalizer;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        CrawlAgency::query()->each(function (CrawlAgency $agency): void {
            $normalized = AgencyNameNormalizer::normalize($agency->name, $agency->city);
            if ($normalized !== '' && $normalized !== $agency->name) {
                $agency->updateQuietly(['name' => $normalized]);
            }
        });

        Prospect::query()->each(function (Prospect $prospect): void {
            $normalized = AgencyNameNormalizer::normalize($prospect->name, $prospect->city);
            if ($normalized !== '' && $normalized !== $prospect->name) {
                $prospect->updateQuietly(['name' => $normalized]);
            }
        });
    }

    public function down(): void
    {
        // Irreversible standardization.
    }
};
