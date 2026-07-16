<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('crawler.extraction_profiles', function (Blueprint $table) {
            $table->unsignedBigInteger('activated_by')->nullable();
            $table->timestampTz('activated_at')->nullable();
        });

        Schema::create('crawler.profile_validation_reports', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('operation_id')->unique();
            $table->unsignedBigInteger('extraction_profile_id');
            $table->unsignedSmallInteger('sampled_url_count');
            $table->unsignedSmallInteger('valid_record_count');
            $table->decimal('valid_ratio', 5, 4);
            $table->jsonb('required_field_coverage');
            $table->jsonb('blocking_failures')->default('[]');
            $table->jsonb('warnings')->default('[]');
            $table->boolean('eligible')->default(false);
            $table->timestampsTz();
            $table->index(['extraction_profile_id', 'created_at']);
        });

        Schema::create('crawler.profile_validation_records', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('profile_validation_report_id');
            $table->text('url');
            $table->jsonb('raw_data')->nullable();
            $table->jsonb('normalized_data')->nullable();
            $table->jsonb('errors')->default('[]');
            $table->jsonb('field_presence')->default('{}');
            $table->boolean('is_valid')->default(false);
            $table->timestampsTz();
            $table->index('profile_validation_report_id');
        });

        DB::statement('ALTER TABLE crawler.extraction_profiles ADD CONSTRAINT extraction_profile_activated_by_fk FOREIGN KEY (activated_by) REFERENCES users(id)');
        DB::statement("CREATE UNIQUE INDEX extraction_profiles_one_active_per_agency ON crawler.extraction_profiles (crawl_agency_id) WHERE status = 'active'");
        DB::statement('ALTER TABLE crawler.profile_validation_reports ADD CONSTRAINT profile_validation_report_operation_fk FOREIGN KEY (operation_id) REFERENCES crawler.operations(id)');
        DB::statement('ALTER TABLE crawler.profile_validation_reports ADD CONSTRAINT profile_validation_report_profile_fk FOREIGN KEY (extraction_profile_id) REFERENCES crawler.extraction_profiles(id)');
        DB::statement('ALTER TABLE crawler.profile_validation_records ADD CONSTRAINT profile_validation_record_report_fk FOREIGN KEY (profile_validation_report_id) REFERENCES crawler.profile_validation_reports(id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('crawler.profile_validation_records');
        Schema::dropIfExists('crawler.profile_validation_reports');
        DB::statement('DROP INDEX IF EXISTS crawler.extraction_profiles_one_active_per_agency');
        Schema::table('crawler.extraction_profiles', function (Blueprint $table) {
            $table->dropColumn(['activated_by', 'activated_at']);
        });
    }
};
