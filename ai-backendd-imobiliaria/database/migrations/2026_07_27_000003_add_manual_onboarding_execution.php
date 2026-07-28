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
            $table->jsonb('manual_configuration')->nullable();
        });

        Schema::table('crawler.onboarding_executions', function (Blueprint $table) {
            $table->unsignedBigInteger('discovery_snapshot_id')->nullable();
        });

        DB::statement('ALTER TABLE crawler.onboarding_executions ALTER COLUMN execution_model_version_id DROP NOT NULL');
        DB::statement('ALTER TABLE crawler.onboarding_executions ALTER COLUMN discovery_policy_version_id DROP NOT NULL');
        DB::statement('ALTER TABLE crawler.onboarding_executions ALTER COLUMN extraction_policy_version_id DROP NOT NULL');
        DB::statement('ALTER TABLE crawler.onboarding_executions ADD CONSTRAINT onboarding_execution_snapshot_fk FOREIGN KEY (discovery_snapshot_id) REFERENCES crawler.discovery_snapshots(id)');

        DB::statement('ALTER TABLE crawler.onboarding_executions DROP CONSTRAINT onboarding_execution_conduction_check');
        DB::statement('ALTER TABLE crawler.onboarding_executions DROP CONSTRAINT onboarding_execution_state_check');
        DB::statement('ALTER TABLE crawler.onboarding_executions DROP CONSTRAINT onboarding_execution_step_check');
        DB::statement("ALTER TABLE crawler.onboarding_executions ADD CONSTRAINT onboarding_execution_conduction_check CHECK (conduction IN ('manual', 'automated'))");
        DB::statement("ALTER TABLE crawler.onboarding_executions ADD CONSTRAINT onboarding_execution_state_check CHECK (state IN ('queued', 'running', 'awaiting_manual_step', 'requires_attention', 'awaiting_approval', 'completed', 'cancelled'))");
        DB::statement("ALTER TABLE crawler.onboarding_executions ADD CONSTRAINT onboarding_execution_step_check CHECK (current_step IN ('discovery', 'sample_url_confirmation', 'profile_generation', 'profile_validation', 'approval'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE crawler.onboarding_executions DROP CONSTRAINT onboarding_execution_conduction_check');
        DB::statement('ALTER TABLE crawler.onboarding_executions DROP CONSTRAINT onboarding_execution_state_check');
        DB::statement('ALTER TABLE crawler.onboarding_executions DROP CONSTRAINT onboarding_execution_step_check');
        DB::statement("ALTER TABLE crawler.onboarding_executions ADD CONSTRAINT onboarding_execution_conduction_check CHECK (conduction IN ('automated'))");
        DB::statement("ALTER TABLE crawler.onboarding_executions ADD CONSTRAINT onboarding_execution_state_check CHECK (state IN ('queued', 'running', 'requires_attention', 'awaiting_approval', 'completed', 'cancelled'))");
        DB::statement("ALTER TABLE crawler.onboarding_executions ADD CONSTRAINT onboarding_execution_step_check CHECK (current_step IN ('discovery', 'profile_generation', 'profile_validation', 'approval'))");

        DB::statement('ALTER TABLE crawler.onboarding_executions ALTER COLUMN execution_model_version_id SET NOT NULL');
        DB::statement('ALTER TABLE crawler.onboarding_executions ALTER COLUMN discovery_policy_version_id SET NOT NULL');
        DB::statement('ALTER TABLE crawler.onboarding_executions ALTER COLUMN extraction_policy_version_id SET NOT NULL');
        DB::statement('ALTER TABLE crawler.onboarding_executions DROP CONSTRAINT onboarding_execution_snapshot_fk');

        Schema::table('crawler.onboarding_executions', function (Blueprint $table) {
            $table->dropColumn('discovery_snapshot_id');
        });
        Schema::table('crawler.onboarding_plans', function (Blueprint $table) {
            $table->dropColumn('manual_configuration');
        });
    }
};
