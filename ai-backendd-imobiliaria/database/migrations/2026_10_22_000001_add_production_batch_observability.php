<?php

use App\Services\Crawler\CrawlerPartitionManager;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('crawler.operation_groups', function (Blueprint $table) {
            $table->unsignedBigInteger('source_group_id')->nullable();
            $table->uuid('request_key')->nullable();
            $table->string('request_fingerprint', 64)->nullable();
            $table->boolean('targets_complete')->default(false);
            $table->unique(['requested_by', 'request_key']);
            $table->foreign('source_group_id')->references('id')->on('crawler.operation_groups');
        });
        Schema::create('crawler.operation_group_targets', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('operation_group_id');
            $table->unsignedBigInteger('crawl_agency_id');
            $table->unsignedBigInteger('operation_id')->nullable();
            $table->string('name');
            $table->string('root_domain');
            $table->string('skip_code')->nullable();
            $table->text('skip_message')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->unique(['operation_group_id', 'crawl_agency_id']);
            $table->index('operation_id');
            $table->foreign('operation_group_id')->references('id')->on('crawler.operation_groups');
            $table->foreign('crawl_agency_id')->references('id')->on('crawler.crawl_agencies');
            $table->foreign('operation_id')->references('id')->on('crawler.operations');
        });
        // The original request and skipped targets cannot be reconstructed for old groups.
        DB::statement(<<<'SQL'
            INSERT INTO crawler.operation_group_targets
                (operation_group_id, crawl_agency_id, operation_id, name, root_domain, created_at)
            SELECT DISTINCT ON (g.id, a.id) g.id, a.id, o.id, a.name, a.root_domain, g.created_at
            FROM crawler.operation_groups g
            JOIN crawler.operation_group_members m ON m.operation_group_id = g.id
            JOIN crawler.operations o ON o.id = m.operation_id
            JOIN crawler.crawl_agencies a ON a.id = o.crawl_agency_id
            WHERE g.action = 'bulk_production_crawl'
            ORDER BY g.id, a.id, o.id
        SQL);
        DB::unprepared(<<<'SQL'
            CREATE TABLE crawler.operation_diagnostics (
                event_id UUID NOT NULL,
                operation_id BIGINT NOT NULL REFERENCES crawler.operations(id),
                schema_version SMALLINT NOT NULL DEFAULT 1,
                kind VARCHAR(32) NOT NULL,
                stage VARCHAR(32) NOT NULL,
                url TEXT,
                strategy VARCHAR(64),
                outcome VARCHAR(32) NOT NULL,
                duration_ms BIGINT NOT NULL DEFAULT 0,
                error_code VARCHAR(128),
                message TEXT,
                fields_present JSONB NOT NULL DEFAULT '[]',
                fields_missing JSONB NOT NULL DEFAULT '[]',
                fallback BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL,
                PRIMARY KEY (event_id, created_at)
            ) PARTITION BY RANGE (created_at);
            CREATE INDEX operation_diagnostics_operation_idx
                ON crawler.operation_diagnostics (operation_id, created_at DESC);
        SQL);
        app(CrawlerPartitionManager::class)->ensureMonths(now()->startOfMonth(), 4);
        app(CrawlerPartitionManager::class)->ensureDefaultPartitions();
    }

    public function down(): void
    {
        Schema::dropIfExists('crawler.operation_diagnostics');
        Schema::dropIfExists('crawler.operation_group_targets');
        Schema::table('crawler.operation_groups', function (Blueprint $table) {
            $table->dropForeign(['source_group_id']);
            $table->dropUnique(['requested_by', 'request_key']);
            $table->dropColumn(['source_group_id', 'request_key', 'request_fingerprint', 'targets_complete']);
        });
    }
};
