<?php

use App\Services\Crawler\CityCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE IF NOT EXISTS crawler.cities (
                id BIGSERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255) NOT NULL,
                state CHAR(2) NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (slug, state)
            )
        SQL);

        CityCatalog::synchronize();
        CityCatalog::normalizeStoredMarketProperties();
    }

    public function down(): void
    {
        // Keep shared catalog table and normalized data intact on rollback.
    }
};
