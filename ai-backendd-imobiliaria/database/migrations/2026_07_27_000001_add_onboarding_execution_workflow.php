<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crawler.discovery_policy_versions', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->unsignedInteger('version');
            $table->string('status')->default('available');
            $table->jsonb('strategies');
            $table->jsonb('configuration')->default('{}');
            $table->unsignedBigInteger('created_by');
            $table->timestampsTz();
            $table->unique(['name', 'version']);
        });

        Schema::create('crawler.extraction_policy_versions', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->unsignedInteger('version');
            $table->string('status')->default('available');
            $table->jsonb('strategies');
            $table->jsonb('configuration')->default('{}');
            $table->unsignedBigInteger('created_by');
            $table->timestampsTz();
            $table->unique(['name', 'version']);
        });

        Schema::create('crawler.onboarding_execution_model_versions', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->unsignedInteger('version');
            $table->string('status')->default('available');
            $table->unsignedBigInteger('discovery_policy_version_id');
            $table->unsignedBigInteger('extraction_policy_version_id');
            $table->unsignedBigInteger('created_by');
            $table->timestampsTz();
            $table->unique(['name', 'version']);
        });

        Schema::table('crawler.onboarding_plans', function (Blueprint $table) {
            $table->string('name')->nullable();
            $table->string('conduction')->nullable();
            $table->unsignedBigInteger('execution_model_version_id')->nullable();
            $table->unsignedBigInteger('confirmed_by')->nullable();
            $table->timestampTz('confirmed_at')->nullable();
        });

        Schema::create('crawler.onboarding_executions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('onboarding_plan_id');
            $table->unsignedBigInteger('crawl_agency_id');
            $table->string('name');
            $table->string('conduction');
            $table->string('state')->default('queued');
            $table->string('current_step')->default('discovery');
            $table->unsignedBigInteger('execution_model_version_id');
            $table->unsignedBigInteger('discovery_policy_version_id');
            $table->unsignedBigInteger('extraction_policy_version_id');
            $table->unsignedBigInteger('market_data_contract_version_id');
            $table->jsonb('resolved_configuration');
            $table->text('sample_url')->nullable();
            $table->jsonb('sample_url_selection')->nullable();
            $table->string('attention_code')->nullable();
            $table->text('attention_message')->nullable();
            $table->unsignedBigInteger('created_by');
            $table->timestampTz('started_at')->nullable();
            $table->timestampTz('paused_at')->nullable();
            $table->timestampTz('completed_at')->nullable();
            $table->timestampsTz();
            $table->index(['crawl_agency_id', 'created_at']);
            $table->index(['state', 'current_step']);
        });

        Schema::table('crawler.operations', function (Blueprint $table) {
            $table->unsignedBigInteger('onboarding_execution_id')->nullable();
            $table->string('onboarding_step')->nullable();
            $table->unsignedSmallInteger('attempt')->default(1);
            $table->index('onboarding_execution_id');
        });

        DB::statement("ALTER TABLE crawler.discovery_policy_versions ADD CONSTRAINT discovery_policy_status_check CHECK (status IN ('available', 'retired'))");
        DB::statement('ALTER TABLE crawler.discovery_policy_versions ADD CONSTRAINT discovery_policy_creator_fk FOREIGN KEY (created_by) REFERENCES users(id)');
        DB::statement("ALTER TABLE crawler.extraction_policy_versions ADD CONSTRAINT extraction_policy_status_check CHECK (status IN ('available', 'retired'))");
        DB::statement('ALTER TABLE crawler.extraction_policy_versions ADD CONSTRAINT extraction_policy_creator_fk FOREIGN KEY (created_by) REFERENCES users(id)');
        DB::statement("ALTER TABLE crawler.onboarding_execution_model_versions ADD CONSTRAINT onboarding_model_status_check CHECK (status IN ('available', 'retired'))");
        DB::statement('ALTER TABLE crawler.onboarding_execution_model_versions ADD CONSTRAINT onboarding_model_discovery_policy_fk FOREIGN KEY (discovery_policy_version_id) REFERENCES crawler.discovery_policy_versions(id)');
        DB::statement('ALTER TABLE crawler.onboarding_execution_model_versions ADD CONSTRAINT onboarding_model_extraction_policy_fk FOREIGN KEY (extraction_policy_version_id) REFERENCES crawler.extraction_policy_versions(id)');
        DB::statement('ALTER TABLE crawler.onboarding_execution_model_versions ADD CONSTRAINT onboarding_model_creator_fk FOREIGN KEY (created_by) REFERENCES users(id)');
        DB::statement("ALTER TABLE crawler.onboarding_plans ADD CONSTRAINT onboarding_plan_conduction_check CHECK (conduction IS NULL OR conduction IN ('manual', 'automated'))");
        DB::statement('ALTER TABLE crawler.onboarding_plans ADD CONSTRAINT onboarding_plan_model_fk FOREIGN KEY (execution_model_version_id) REFERENCES crawler.onboarding_execution_model_versions(id)');
        DB::statement('ALTER TABLE crawler.onboarding_plans ADD CONSTRAINT onboarding_plan_confirmer_fk FOREIGN KEY (confirmed_by) REFERENCES users(id)');
        DB::statement("ALTER TABLE crawler.onboarding_executions ADD CONSTRAINT onboarding_execution_conduction_check CHECK (conduction IN ('automated'))");
        DB::statement("ALTER TABLE crawler.onboarding_executions ADD CONSTRAINT onboarding_execution_state_check CHECK (state IN ('queued', 'running', 'requires_attention', 'awaiting_approval', 'completed', 'cancelled'))");
        DB::statement("ALTER TABLE crawler.onboarding_executions ADD CONSTRAINT onboarding_execution_step_check CHECK (current_step IN ('discovery', 'profile_generation', 'profile_validation', 'approval'))");
        DB::statement('ALTER TABLE crawler.onboarding_executions ADD CONSTRAINT onboarding_execution_plan_fk FOREIGN KEY (onboarding_plan_id) REFERENCES crawler.onboarding_plans(id)');
        DB::statement('ALTER TABLE crawler.onboarding_executions ADD CONSTRAINT onboarding_execution_agency_fk FOREIGN KEY (crawl_agency_id) REFERENCES crawler.crawl_agencies(id)');
        DB::statement('ALTER TABLE crawler.onboarding_executions ADD CONSTRAINT onboarding_execution_model_fk FOREIGN KEY (execution_model_version_id) REFERENCES crawler.onboarding_execution_model_versions(id)');
        DB::statement('ALTER TABLE crawler.onboarding_executions ADD CONSTRAINT onboarding_execution_discovery_policy_fk FOREIGN KEY (discovery_policy_version_id) REFERENCES crawler.discovery_policy_versions(id)');
        DB::statement('ALTER TABLE crawler.onboarding_executions ADD CONSTRAINT onboarding_execution_extraction_policy_fk FOREIGN KEY (extraction_policy_version_id) REFERENCES crawler.extraction_policy_versions(id)');
        DB::statement('ALTER TABLE crawler.onboarding_executions ADD CONSTRAINT onboarding_execution_contract_fk FOREIGN KEY (market_data_contract_version_id) REFERENCES crawler.market_data_contract_versions(id)');
        DB::statement('ALTER TABLE crawler.onboarding_executions ADD CONSTRAINT onboarding_execution_creator_fk FOREIGN KEY (created_by) REFERENCES users(id)');
        DB::statement("CREATE UNIQUE INDEX crawler_one_nonterminal_onboarding_per_agency ON crawler.onboarding_executions (crawl_agency_id) WHERE state NOT IN ('completed', 'cancelled')");
        DB::statement('ALTER TABLE crawler.operations ADD CONSTRAINT crawler_operation_onboarding_execution_fk FOREIGN KEY (onboarding_execution_id) REFERENCES crawler.onboarding_executions(id)');
        DB::statement('CREATE UNIQUE INDEX crawler_onboarding_operation_attempt_unique ON crawler.operations (onboarding_execution_id, onboarding_step, attempt) WHERE onboarding_execution_id IS NOT NULL');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS crawler.crawler_onboarding_operation_attempt_unique');
        DB::statement('ALTER TABLE crawler.operations DROP CONSTRAINT IF EXISTS crawler_operation_onboarding_execution_fk');
        Schema::table('crawler.operations', function (Blueprint $table) {
            $table->dropColumn(['onboarding_execution_id', 'onboarding_step', 'attempt']);
        });

        Schema::dropIfExists('crawler.onboarding_executions');

        DB::statement('ALTER TABLE crawler.onboarding_plans DROP CONSTRAINT IF EXISTS onboarding_plan_conduction_check');
        DB::statement('ALTER TABLE crawler.onboarding_plans DROP CONSTRAINT IF EXISTS onboarding_plan_model_fk');
        DB::statement('ALTER TABLE crawler.onboarding_plans DROP CONSTRAINT IF EXISTS onboarding_plan_confirmer_fk');
        Schema::table('crawler.onboarding_plans', function (Blueprint $table) {
            $table->dropColumn([
                'name',
                'conduction',
                'execution_model_version_id',
                'confirmed_by',
                'confirmed_at',
            ]);
        });

        Schema::dropIfExists('crawler.onboarding_execution_model_versions');
        Schema::dropIfExists('crawler.extraction_policy_versions');
        Schema::dropIfExists('crawler.discovery_policy_versions');
    }
};
