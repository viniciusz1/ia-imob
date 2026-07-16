<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('crawler.crawl_runs', function (Blueprint $table) {
            $table->timestampTz('published_at')->nullable();
            $table->timestampTz('quarantined_at')->nullable();
        });
        Schema::table('crawler.crawl_agencies', function (Blueprint $table) {
            $table->unsignedBigInteger('current_published_crawl_run_id')->nullable();
            $table->index('current_published_crawl_run_id');
        });
        Schema::create('crawler.quality_gate_reports', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('crawl_run_id')->unique();
            $table->unsignedBigInteger('market_data_contract_version_id');
            $table->unsignedBigInteger('quality_policy_version_id');
            $table->string('verdict', 32);
            $table->jsonb('blockers')->default('[]');
            $table->jsonb('warnings')->default('[]');
            $table->jsonb('evidence')->default('{}');
            $table->timestampTz('evaluated_at');
            $table->timestampsTz();
        });

        DB::statement('ALTER TABLE crawler.crawl_agencies ADD CONSTRAINT crawl_agency_current_publication_fk FOREIGN KEY (current_published_crawl_run_id) REFERENCES crawler.crawl_runs(id)');
        DB::statement('ALTER TABLE crawler.quality_gate_reports ADD CONSTRAINT quality_report_run_fk FOREIGN KEY (crawl_run_id) REFERENCES crawler.crawl_runs(id)');
        DB::statement('ALTER TABLE crawler.quality_gate_reports ADD CONSTRAINT quality_report_contract_fk FOREIGN KEY (market_data_contract_version_id) REFERENCES crawler.market_data_contract_versions(id)');
        DB::statement('ALTER TABLE crawler.quality_gate_reports ADD CONSTRAINT quality_report_policy_fk FOREIGN KEY (quality_policy_version_id) REFERENCES crawler.quality_policy_versions(id)');
        DB::statement("ALTER TABLE crawler.quality_gate_reports ADD CONSTRAINT quality_report_verdict_check CHECK (verdict IN ('approved', 'blocked'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('crawler.quality_gate_reports');
        Schema::table('crawler.crawl_agencies', function (Blueprint $table) {
            $table->dropColumn('current_published_crawl_run_id');
        });
        Schema::table('crawler.crawl_runs', function (Blueprint $table) {
            $table->dropColumn(['published_at', 'quarantined_at']);
        });
    }
};
