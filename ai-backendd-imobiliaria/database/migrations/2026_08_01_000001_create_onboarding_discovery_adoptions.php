<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crawler.onboarding_discovery_adoptions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('onboarding_execution_id')->unique();
            $table->unsignedBigInteger('discovery_snapshot_id');
            $table->unsignedBigInteger('source_operation_id');
            $table->unsignedBigInteger('replaced_operation_id');
            $table->unsignedBigInteger('adopted_by');
            $table->jsonb('original_discovery_configuration');
            $table->text('note')->nullable();
            $table->timestampTz('adopted_at');
            $table->timestampsTz();
        });

        DB::statement('ALTER TABLE crawler.onboarding_discovery_adoptions ADD CONSTRAINT onboarding_adoption_execution_fk FOREIGN KEY (onboarding_execution_id) REFERENCES crawler.onboarding_executions(id)');
        DB::statement('ALTER TABLE crawler.onboarding_discovery_adoptions ADD CONSTRAINT onboarding_adoption_snapshot_fk FOREIGN KEY (discovery_snapshot_id) REFERENCES crawler.discovery_snapshots(id)');
        DB::statement('ALTER TABLE crawler.onboarding_discovery_adoptions ADD CONSTRAINT onboarding_adoption_source_operation_fk FOREIGN KEY (source_operation_id) REFERENCES crawler.operations(id)');
        DB::statement('ALTER TABLE crawler.onboarding_discovery_adoptions ADD CONSTRAINT onboarding_adoption_replaced_operation_fk FOREIGN KEY (replaced_operation_id) REFERENCES crawler.operations(id)');
        DB::statement('ALTER TABLE crawler.onboarding_discovery_adoptions ADD CONSTRAINT onboarding_adoption_actor_fk FOREIGN KEY (adopted_by) REFERENCES users(id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('crawler.onboarding_discovery_adoptions');
    }
};
