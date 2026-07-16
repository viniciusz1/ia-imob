<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crawler.schedule_defaults', function (Blueprint $table) {
            $table->id();
            $table->string('preset')->default('manual');
            $table->string('timezone')->default('America/Sao_Paulo');
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestampsTz();
        });
        DB::table('crawler.schedule_defaults')->insert([
            'id' => 1,
            'preset' => 'manual',
            'timezone' => 'America/Sao_Paulo',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        Schema::create('crawler.crawl_agency_schedules', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('crawl_agency_id')->unique();
            $table->boolean('inherit_default')->default(true);
            $table->string('preset')->nullable();
            $table->string('timezone')->nullable();
            $table->timestampTz('next_run_at')->nullable();
            $table->timestampTz('last_enqueued_at')->nullable();
            $table->timestampTz('suspended_at')->nullable();
            $table->string('suspension_reason')->nullable();
            $table->unsignedBigInteger('created_by');
            $table->unsignedBigInteger('updated_by');
            $table->timestampsTz();
            $table->index('next_run_at');
        });
        Schema::create('crawler.crawl_agency_circuits', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('crawl_agency_id')->unique();
            $table->string('state')->default('closed');
            $table->unsignedInteger('consecutive_failures')->default(0);
            $table->unsignedBigInteger('last_evaluated_operation_id')->nullable();
            $table->timestampTz('opened_at')->nullable();
            $table->timestampTz('closed_at')->nullable();
            $table->string('reason')->nullable();
            $table->timestampsTz();
        });

        DB::statement('ALTER TABLE crawler.schedule_defaults ADD CONSTRAINT schedule_default_user_fk FOREIGN KEY (updated_by) REFERENCES users(id)');
        DB::statement('ALTER TABLE crawler.crawl_agency_schedules ADD CONSTRAINT crawl_schedule_agency_fk FOREIGN KEY (crawl_agency_id) REFERENCES crawler.crawl_agencies(id)');
        DB::statement('ALTER TABLE crawler.crawl_agency_schedules ADD CONSTRAINT crawl_schedule_creator_fk FOREIGN KEY (created_by) REFERENCES users(id)');
        DB::statement('ALTER TABLE crawler.crawl_agency_schedules ADD CONSTRAINT crawl_schedule_updater_fk FOREIGN KEY (updated_by) REFERENCES users(id)');
        DB::statement('ALTER TABLE crawler.crawl_agency_circuits ADD CONSTRAINT crawl_circuit_agency_fk FOREIGN KEY (crawl_agency_id) REFERENCES crawler.crawl_agencies(id)');
        DB::statement("ALTER TABLE crawler.schedule_defaults ADD CONSTRAINT schedule_default_preset_check CHECK (preset IN ('manual', 'daily', 'twice_weekly', 'weekly'))");
        DB::statement("ALTER TABLE crawler.crawl_agency_schedules ADD CONSTRAINT crawl_schedule_preset_check CHECK (preset IS NULL OR preset IN ('manual', 'daily', 'twice_weekly', 'weekly'))");
        DB::statement("ALTER TABLE crawler.crawl_agency_circuits ADD CONSTRAINT crawl_circuit_state_check CHECK (state IN ('closed', 'open'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('crawler.crawl_agency_circuits');
        Schema::dropIfExists('crawler.crawl_agency_schedules');
        Schema::dropIfExists('crawler.schedule_defaults');
    }
};
