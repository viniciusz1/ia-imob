<?php

use App\Services\Crawler\NeighborhoodCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE IF NOT EXISTS crawler.neighborhoods (
                id BIGSERIAL PRIMARY KEY,
                city_id BIGINT NOT NULL REFERENCES crawler.cities(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255) NOT NULL,
                aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (city_id, slug)
            )
        SQL);

        NeighborhoodCatalog::synchronize();
        NeighborhoodCatalog::normalizeStoredMarketProperties();
    }

    public function down(): void
    {
        // Keep shared catalog table and normalized data intact on rollback.
    }
};
