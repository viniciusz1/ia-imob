<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE INDEX crawl_runs_published_history_idx
            ON crawler.crawl_runs (crawl_agency_id, published_at)
            WHERE publication_state = 'published' AND published_at IS NOT NULL
        SQL);
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS crawler.crawl_runs_published_history_idx');
    }
};
