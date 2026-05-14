<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');

        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION public.f_unaccent(text)
            RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS
            $func$ SELECT public.unaccent('public.unaccent', $1) $func$;
        SQL);

        DB::statement('CREATE INDEX IF NOT EXISTS idx_scrapy_props_bairro_trgm
            ON "scrapy-properties" USING GIN (f_unaccent(bairro) gin_trgm_ops)');

        DB::statement('CREATE INDEX IF NOT EXISTS idx_scrapy_props_cidade_trgm
            ON "scrapy-properties" USING GIN (f_unaccent(cidade) gin_trgm_ops)');

        DB::statement('CREATE INDEX IF NOT EXISTS idx_scrapy_props_descricao_trgm
            ON "scrapy-properties" USING GIN (f_unaccent(descricao) gin_trgm_ops)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_scrapy_props_bairro_trgm');
        DB::statement('DROP INDEX IF EXISTS idx_scrapy_props_cidade_trgm');
        DB::statement('DROP INDEX IF EXISTS idx_scrapy_props_descricao_trgm');
        DB::statement('DROP FUNCTION IF EXISTS public.f_unaccent(text)');
    }
};
