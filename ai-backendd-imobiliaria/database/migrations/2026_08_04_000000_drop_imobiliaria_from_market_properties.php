<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * The imobiliária name is now derived from the Crawl Agency that owns each
 * Crawl Run (crawler.market_properties -> crawler.crawl_runs -> crawler.crawl_agencies.name),
 * so the denormalized `imobiliaria` column on crawler.market_properties is redundant.
 *
 * Raw ALTER on the partitioned parent table: the DROP propagates to every partition.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE crawler.market_properties DROP COLUMN IF EXISTS imobiliaria');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE crawler.market_properties ADD COLUMN imobiliaria VARCHAR(255) NULL');
    }
};
