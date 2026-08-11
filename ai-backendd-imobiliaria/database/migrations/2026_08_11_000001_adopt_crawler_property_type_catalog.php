<?php

use App\Models\SystemEnum;
use App\Services\Crawler\PropertyTypeCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE TABLE IF NOT EXISTS crawler.property_types (
                id BIGSERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                slug VARCHAR(255) NOT NULL UNIQUE,
                aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        SQL);
        DB::statement(<<<'SQL'
            ALTER TABLE crawler.property_types
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE
        SQL);

        PropertyTypeCatalog::synchronize();
        PropertyTypeCatalog::normalizeStoredMarketProperties();
        SystemEnum::query()->updateOrCreate(
            ['tag' => 'property_types'],
            ['data' => PropertyTypeCatalog::systemEnumOptions()],
        );
    }

    public function down(): void
    {
        // This migration adopts a catalog that may predate Laravel ownership.
        // Keep the shared table and its data intact on rollback.
    }
};
