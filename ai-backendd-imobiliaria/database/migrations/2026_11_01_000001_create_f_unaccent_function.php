<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Immutable wrapper around unaccent(), used by accent-insensitive city and
 * neighbourhood lookups (MarketProperty, NeighborhoodCatalog). It existed in
 * the development database but no migration created it, so fresh databases —
 * including the test database — failed from the 2026-11-02 catalog migration.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('CREATE EXTENSION IF NOT EXISTS unaccent');
        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION public.f_unaccent(text)
            RETURNS text
            LANGUAGE sql
            IMMUTABLE PARALLEL SAFE STRICT
            AS $function$ SELECT public.unaccent('public.unaccent', $1) $function$
        SQL);
    }

    public function down(): void
    {
        // Kept on rollback: databases created before this migration relied on it.
    }
};
