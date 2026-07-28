<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('crawler.onboarding_plans', function (Blueprint $table) {
            $table->string('first_production_discovery_mode')->default('fresh');
        });

        Schema::table('crawler.crawl_agencies', function (Blueprint $table) {
            $table->unsignedBigInteger('active_discovery_policy_version_id')->nullable();
            $table->index('active_discovery_policy_version_id');
        });

        Schema::table('crawler.onboarding_executions', function (Blueprint $table) {
            $table->string('first_production_discovery_mode')->default('fresh');
            $table->unsignedBigInteger('extraction_profile_id')->nullable();
            $table->unsignedBigInteger('profile_validation_report_id')->nullable();
            $table->unsignedBigInteger('first_production_crawl_run_id')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestampTz('approved_at')->nullable();
            $table->text('approval_reason')->nullable();
        });

        DB::statement('ALTER TABLE crawler.crawl_agencies ADD CONSTRAINT crawl_agency_active_discovery_policy_fk FOREIGN KEY (active_discovery_policy_version_id) REFERENCES crawler.discovery_policy_versions(id)');
        DB::statement('ALTER TABLE crawler.onboarding_executions ADD CONSTRAINT onboarding_execution_profile_fk FOREIGN KEY (extraction_profile_id) REFERENCES crawler.extraction_profiles(id)');
        DB::statement('ALTER TABLE crawler.onboarding_executions ADD CONSTRAINT onboarding_execution_validation_report_fk FOREIGN KEY (profile_validation_report_id) REFERENCES crawler.profile_validation_reports(id)');
        DB::statement('ALTER TABLE crawler.onboarding_executions ADD CONSTRAINT onboarding_execution_first_run_fk FOREIGN KEY (first_production_crawl_run_id) REFERENCES crawler.crawl_runs(id)');
        DB::statement('ALTER TABLE crawler.onboarding_executions ADD CONSTRAINT onboarding_execution_approver_fk FOREIGN KEY (approved_by) REFERENCES users(id)');

        DB::statement('ALTER TABLE crawler.onboarding_executions DROP CONSTRAINT onboarding_execution_state_check');
        DB::statement('ALTER TABLE crawler.onboarding_executions DROP CONSTRAINT onboarding_execution_step_check');
        DB::statement("ALTER TABLE crawler.onboarding_executions ADD CONSTRAINT onboarding_execution_state_check CHECK (state IN ('queued', 'running', 'awaiting_manual_step', 'requires_attention', 'awaiting_approval', 'awaiting_first_production', 'completed', 'cancelled'))");
        DB::statement("ALTER TABLE crawler.onboarding_executions ADD CONSTRAINT onboarding_execution_step_check CHECK (current_step IN ('discovery', 'sample_url_confirmation', 'profile_generation', 'profile_validation', 'approval', 'first_production', 'quality_gate'))");
        DB::statement("ALTER TABLE crawler.onboarding_plans ADD CONSTRAINT onboarding_plan_first_production_mode_check CHECK (first_production_discovery_mode IN ('fresh', 'validation_snapshot'))");
        DB::statement("ALTER TABLE crawler.onboarding_executions ADD CONSTRAINT onboarding_execution_first_production_mode_check CHECK (first_production_discovery_mode IN ('fresh', 'validation_snapshot'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE crawler.onboarding_plans DROP CONSTRAINT onboarding_plan_first_production_mode_check');
        DB::statement('ALTER TABLE crawler.onboarding_executions DROP CONSTRAINT onboarding_execution_first_production_mode_check');
        DB::statement('ALTER TABLE crawler.onboarding_executions DROP CONSTRAINT onboarding_execution_state_check');
        DB::statement('ALTER TABLE crawler.onboarding_executions DROP CONSTRAINT onboarding_execution_step_check');
        DB::statement("UPDATE crawler.onboarding_executions SET state = CASE WHEN state = 'awaiting_first_production' THEN 'requires_attention' ELSE state END, current_step = 'approval' WHERE current_step IN ('first_production', 'quality_gate')");
        DB::statement("ALTER TABLE crawler.onboarding_executions ADD CONSTRAINT onboarding_execution_state_check CHECK (state IN ('queued', 'running', 'awaiting_manual_step', 'requires_attention', 'awaiting_approval', 'completed', 'cancelled'))");
        DB::statement("ALTER TABLE crawler.onboarding_executions ADD CONSTRAINT onboarding_execution_step_check CHECK (current_step IN ('discovery', 'sample_url_confirmation', 'profile_generation', 'profile_validation', 'approval'))");

        DB::statement('ALTER TABLE crawler.onboarding_executions DROP CONSTRAINT onboarding_execution_profile_fk');
        DB::statement('ALTER TABLE crawler.onboarding_executions DROP CONSTRAINT onboarding_execution_validation_report_fk');
        DB::statement('ALTER TABLE crawler.onboarding_executions DROP CONSTRAINT onboarding_execution_first_run_fk');
        DB::statement('ALTER TABLE crawler.onboarding_executions DROP CONSTRAINT onboarding_execution_approver_fk');
        Schema::table('crawler.onboarding_executions', function (Blueprint $table) {
            $table->dropColumn([
                'first_production_discovery_mode',
                'extraction_profile_id',
                'profile_validation_report_id',
                'first_production_crawl_run_id',
                'approved_by',
                'approved_at',
                'approval_reason',
            ]);
        });

        DB::statement('ALTER TABLE crawler.crawl_agencies DROP CONSTRAINT crawl_agency_active_discovery_policy_fk');
        Schema::table('crawler.crawl_agencies', function (Blueprint $table) {
            $table->dropColumn('active_discovery_policy_version_id');
        });

        Schema::table('crawler.onboarding_plans', function (Blueprint $table) {
            $table->dropColumn('first_production_discovery_mode');
        });
    }
};
