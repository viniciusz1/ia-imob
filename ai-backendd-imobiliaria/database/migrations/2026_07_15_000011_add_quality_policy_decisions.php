<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('crawler.quality_policy_versions', function (Blueprint $table) {
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('activated_by')->nullable();
            $table->timestampTz('activated_at')->nullable();
        });
        DB::statement(<<<'SQL'
            UPDATE crawler.quality_policy_versions
            SET rules = '{"maximum_stock_drop_ratio":0.5,"maximum_error_ratio":0.3,"maximum_rejection_ratio":0.3}'::jsonb || rules
        SQL);
        Schema::create('crawler.quality_policy_exceptions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('crawl_agency_id');
            $table->unsignedBigInteger('quality_gate_report_id');
            $table->unsignedBigInteger('created_by');
            $table->text('reason');
            $table->timestampTz('created_at')->useCurrent();
        });
        Schema::create('crawler.exceptional_publications', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('crawl_run_id')->unique();
            $table->unsignedBigInteger('quality_gate_report_id');
            $table->unsignedBigInteger('published_by');
            $table->text('reason');
            $table->timestampTz('published_at');
            $table->timestampTz('created_at')->useCurrent();
        });

        DB::statement('ALTER TABLE crawler.quality_policy_versions ADD CONSTRAINT quality_policy_creator_fk FOREIGN KEY (created_by) REFERENCES users(id)');
        DB::statement('ALTER TABLE crawler.quality_policy_versions ADD CONSTRAINT quality_policy_activator_fk FOREIGN KEY (activated_by) REFERENCES users(id)');
        DB::statement('ALTER TABLE crawler.quality_policy_exceptions ADD CONSTRAINT quality_exception_agency_fk FOREIGN KEY (crawl_agency_id) REFERENCES crawler.crawl_agencies(id)');
        DB::statement('ALTER TABLE crawler.quality_policy_exceptions ADD CONSTRAINT quality_exception_report_fk FOREIGN KEY (quality_gate_report_id) REFERENCES crawler.quality_gate_reports(id)');
        DB::statement('ALTER TABLE crawler.quality_policy_exceptions ADD CONSTRAINT quality_exception_user_fk FOREIGN KEY (created_by) REFERENCES users(id)');
        DB::statement('ALTER TABLE crawler.exceptional_publications ADD CONSTRAINT exceptional_publication_run_fk FOREIGN KEY (crawl_run_id) REFERENCES crawler.crawl_runs(id)');
        DB::statement('ALTER TABLE crawler.exceptional_publications ADD CONSTRAINT exceptional_publication_report_fk FOREIGN KEY (quality_gate_report_id) REFERENCES crawler.quality_gate_reports(id)');
        DB::statement('ALTER TABLE crawler.exceptional_publications ADD CONSTRAINT exceptional_publication_user_fk FOREIGN KEY (published_by) REFERENCES users(id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('crawler.exceptional_publications');
        Schema::dropIfExists('crawler.quality_policy_exceptions');
        Schema::table('crawler.quality_policy_versions', function (Blueprint $table) {
            $table->dropColumn(['created_by', 'activated_by', 'activated_at']);
        });
    }
};
