<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crawler.worker_instances', function (Blueprint $table) {
            $table->id();
            $table->string('worker_key')->unique();
            $table->string('version');
            $table->jsonb('capacity')->default('{}');
            $table->string('health_state')->default('healthy');
            $table->timestampTz('last_heartbeat_at');
            $table->timestampsTz();
        });

        Schema::create('crawler.operations', function (Blueprint $table) {
            $table->id();
            $table->string('type');
            $table->string('state')->default('queued');
            $table->unsignedBigInteger('requested_by');
            $table->unsignedBigInteger('crawl_agency_id')->nullable();
            $table->unsignedBigInteger('market_data_contract_version_id')->nullable();
            $table->unsignedBigInteger('worker_instance_id')->nullable();
            $table->jsonb('plan');
            $table->string('stage')->default('queued');
            $table->unsignedSmallInteger('progress_percentage')->default(0);
            $table->unsignedBigInteger('processed_items')->default(0);
            $table->unsignedBigInteger('total_items')->nullable();
            $table->text('progress_message')->nullable();
            $table->timestampTz('heartbeat_at')->nullable();
            $table->timestampTz('lease_expires_at')->nullable();
            $table->timestampTz('claimed_at')->nullable();
            $table->timestampTz('completed_at')->nullable();
            $table->jsonb('result')->nullable();
            $table->string('error_code')->nullable();
            $table->text('error_message')->nullable();
            $table->timestampsTz();
            $table->index(['state', 'type', 'created_at']);
            $table->index(['crawl_agency_id', 'state']);
            $table->index('lease_expires_at');
        });

        Schema::create('crawler.discovery_snapshots', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('operation_id')->unique();
            $table->unsignedBigInteger('crawl_agency_id');
            $table->unsignedInteger('url_count');
            $table->string('content_hash', 64);
            $table->timestampTz('created_at')->useCurrent();
            $table->index(['crawl_agency_id', 'created_at']);
        });

        Schema::create('crawler.discovery_snapshot_urls', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('discovery_snapshot_id');
            $table->text('url');
            $table->string('url_hash', 64);
            $table->timestampTz('created_at')->useCurrent();
            $table->unique(['discovery_snapshot_id', 'url_hash']);
        });

        DB::statement("ALTER TABLE crawler.operations ADD CONSTRAINT crawler_operation_state_check CHECK (state IN ('queued', 'running', 'cancellation_requested', 'succeeded', 'failed', 'cancelled'))");
        DB::statement('ALTER TABLE crawler.operations ADD CONSTRAINT crawler_operation_agency_fk FOREIGN KEY (crawl_agency_id) REFERENCES crawler.crawl_agencies(id)');
        DB::statement('ALTER TABLE crawler.operations ADD CONSTRAINT crawler_operation_contract_fk FOREIGN KEY (market_data_contract_version_id) REFERENCES crawler.market_data_contract_versions(id)');
        DB::statement('ALTER TABLE crawler.operations ADD CONSTRAINT crawler_operation_worker_fk FOREIGN KEY (worker_instance_id) REFERENCES crawler.worker_instances(id)');
        DB::statement('ALTER TABLE crawler.discovery_snapshots ADD CONSTRAINT discovery_snapshot_operation_fk FOREIGN KEY (operation_id) REFERENCES crawler.operations(id)');
        DB::statement('ALTER TABLE crawler.discovery_snapshots ADD CONSTRAINT discovery_snapshot_agency_fk FOREIGN KEY (crawl_agency_id) REFERENCES crawler.crawl_agencies(id)');
        DB::statement('ALTER TABLE crawler.discovery_snapshot_urls ADD CONSTRAINT discovery_snapshot_url_snapshot_fk FOREIGN KEY (discovery_snapshot_id) REFERENCES crawler.discovery_snapshots(id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('crawler.discovery_snapshot_urls');
        Schema::dropIfExists('crawler.discovery_snapshots');
        Schema::dropIfExists('crawler.operations');
        Schema::dropIfExists('crawler.worker_instances');
    }
};
