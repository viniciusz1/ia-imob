<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crawler.crawl_run_quality_rejections', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('crawl_run_id')->unique();
            $table->unsignedBigInteger('quality_gate_report_id');
            $table->unsignedBigInteger('rejected_by');
            $table->text('reason');
            $table->timestampTz('rejected_at');
            $table->timestampTz('created_at')->useCurrent();
        });

        DB::statement('ALTER TABLE crawler.crawl_run_quality_rejections ADD CONSTRAINT crawl_run_quality_rejection_run_fk FOREIGN KEY (crawl_run_id) REFERENCES crawler.crawl_runs(id)');
        DB::statement('ALTER TABLE crawler.crawl_run_quality_rejections ADD CONSTRAINT crawl_run_quality_rejection_report_fk FOREIGN KEY (quality_gate_report_id) REFERENCES crawler.quality_gate_reports(id)');
        DB::statement('ALTER TABLE crawler.crawl_run_quality_rejections ADD CONSTRAINT crawl_run_quality_rejection_user_fk FOREIGN KEY (rejected_by) REFERENCES users(id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('crawler.crawl_run_quality_rejections');
    }
};
