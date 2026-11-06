<?php

use App\Services\Crawler\CityCatalog;
use App\Services\Crawler\NeighborhoodCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE crawler.cities ADD COLUMN IF NOT EXISTS aliases JSONB NOT NULL DEFAULT '[]'::jsonb");

        CityCatalog::synchronize();
        NeighborhoodCatalog::synchronize();
    }

    public function down(): void
    {
        // Keep shared catalog tables and normalized data intact on rollback.
    }
};
