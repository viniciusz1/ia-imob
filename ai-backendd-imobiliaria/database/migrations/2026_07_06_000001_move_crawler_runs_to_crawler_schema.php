<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE SCHEMA IF NOT EXISTS crawler');

        // Drop any previous crawler-schema copies first so we can recreate them cleanly.
        DB::statement('DROP TABLE IF EXISTS crawler.schema_runs, crawler.discovery_runs, crawler.crawler_runs CASCADE');

        // 1. Create crawler.crawler_runs with the same shape as the old public table.
        Schema::create('crawler.crawler_runs', function (Blueprint $table) {
            $table->id();
            $table->string('source_name');
            $table->string('status')->default('running');
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('completed_at')->nullable();
            $table->text('error_message')->nullable();
            $table->integer('properties_count')->nullable();
            $table->boolean('latest')->default(false);
            $table->timestamps();

            $table->index('source_name');
            $table->index('status');
            $table->index(['source_name', 'latest']);
        });

        // 2. Copy existing runs so IDs are preserved for dependent rows.
        if (Schema::hasTable('crawler_runs')) {
            DB::statement('INSERT INTO crawler.crawler_runs SELECT * FROM public.crawler_runs');
        }

        // 3. Move discovery_runs to the crawler schema.
        Schema::dropIfExists('crawler.discovery_runs');
        Schema::create('crawler.discovery_runs', function (Blueprint $table) {
            $table->id();
            $table->string('source_name');
            $table->foreignId('crawler_run_id')->nullable()->constrained('crawler.crawler_runs')->nullOnDelete();
            $table->jsonb('urls')->nullable();
            $table->string('status')->default('running');
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('completed_at')->nullable();
            $table->text('error_message')->nullable();
            $table->boolean('latest')->default(false);
            $table->timestamps();

            $table->index('source_name');
            $table->index('status');
            $table->index(['source_name', 'latest']);
        });

        if (Schema::hasTable('discovery_runs')) {
            DB::statement('INSERT INTO crawler.discovery_runs SELECT * FROM public.discovery_runs');
        }

        // 4. Move schema_runs to the crawler schema.
        Schema::dropIfExists('crawler.schema_runs');
        Schema::create('crawler.schema_runs', function (Blueprint $table) {
            $table->id();
            $table->string('source_name');
            $table->foreignId('crawler_run_id')->nullable()->constrained('crawler.crawler_runs')->nullOnDelete();
            $table->jsonb('schema_data')->nullable();
            $table->string('schema_type')->nullable();
            $table->string('sample_url')->nullable();
            $table->jsonb('fields_snapshot')->nullable();
            $table->string('status')->default('running');
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('completed_at')->nullable();
            $table->text('error_message')->nullable();
            $table->boolean('latest')->default(false);
            $table->timestamps();

            $table->index('source_name');
            $table->index('status');
            $table->index(['source_name', 'latest']);
        });

        if (Schema::hasTable('schema_runs')) {
            DB::statement('INSERT INTO crawler.schema_runs SELECT * FROM public.schema_runs');
        }

        // 5. Repoint FKs on raw_properties and market_properties to the new crawler.crawler_runs
        //    before dropping the old public crawler_runs table they currently reference.
        Schema::table('crawler.raw_properties', function (Blueprint $table) {
            $table->dropForeign(['crawler_run_id']);
            $table->foreign('crawler_run_id')->references('id')->on('crawler.crawler_runs')->cascadeOnDelete();
        });

        Schema::table('crawler.market_properties', function (Blueprint $table) {
            $table->dropForeign(['crawler_run_id']);
            $table->foreign('crawler_run_id')->references('id')->on('crawler.crawler_runs')->cascadeOnDelete();
        });

        // 6. Drop the old public tables.
        Schema::dropIfExists('schema_runs');
        Schema::dropIfExists('discovery_runs');
        Schema::dropIfExists('crawler_runs');
    }

    public function down(): void
    {
        // 1. Recreate the public crawler_runs table first so FKs have a target.
        Schema::dropIfExists('crawler_runs');
        Schema::create('crawler_runs', function (Blueprint $table) {
            $table->id();
            $table->string('source_name');
            $table->string('status')->default('running');
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('completed_at')->nullable();
            $table->text('error_message')->nullable();
            $table->integer('properties_count')->nullable();
            $table->boolean('latest')->default(false);
            $table->timestamps();

            $table->index('source_name');
            $table->index('status');
            $table->index(['source_name', 'latest']);
        });

        // 2. Point dependent tables back to the public crawler_runs before dropping the crawler copies.
        Schema::table('crawler.raw_properties', function (Blueprint $table) {
            $table->dropForeign(['crawler_run_id']);
            $table->foreign('crawler_run_id')->references('id')->on('crawler_runs')->cascadeOnDelete();
        });

        Schema::table('crawler.market_properties', function (Blueprint $table) {
            $table->dropForeign(['crawler_run_id']);
            $table->foreign('crawler_run_id')->references('id')->on('crawler_runs')->cascadeOnDelete();
        });

        // 3. Copy data from crawler-schema tables into the recreated public tables.
        if (Schema::hasTable('crawler.crawler_runs')) {
            DB::statement('INSERT INTO public.crawler_runs SELECT * FROM crawler.crawler_runs');
        }

        Schema::dropIfExists('discovery_runs');
        Schema::create('discovery_runs', function (Blueprint $table) {
            $table->id();
            $table->string('source_name');
            $table->foreignId('crawler_run_id')->nullable()->constrained('crawler_runs')->nullOnDelete();
            $table->jsonb('urls')->nullable();
            $table->string('status')->default('running');
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('completed_at')->nullable();
            $table->text('error_message')->nullable();
            $table->boolean('latest')->default(false);
            $table->timestamps();

            $table->index('source_name');
            $table->index('status');
            $table->index(['source_name', 'latest']);
        });

        if (Schema::hasTable('crawler.discovery_runs')) {
            DB::statement('INSERT INTO public.discovery_runs SELECT * FROM crawler.discovery_runs');
        }

        Schema::dropIfExists('schema_runs');
        Schema::create('schema_runs', function (Blueprint $table) {
            $table->id();
            $table->string('source_name');
            $table->foreignId('crawler_run_id')->nullable()->constrained('crawler_runs')->nullOnDelete();
            $table->jsonb('schema_data')->nullable();
            $table->string('schema_type')->nullable();
            $table->string('sample_url')->nullable();
            $table->jsonb('fields_snapshot')->nullable();
            $table->string('status')->default('running');
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('completed_at')->nullable();
            $table->text('error_message')->nullable();
            $table->boolean('latest')->default(false);
            $table->timestamps();

            $table->index('source_name');
            $table->index('status');
            $table->index(['source_name', 'latest']);
        });

        if (Schema::hasTable('crawler.schema_runs')) {
            DB::statement('INSERT INTO public.schema_runs SELECT * FROM crawler.schema_runs');
        }

        // 4. Drop the crawler-schema copies.
        Schema::dropIfExists('crawler.schema_runs');
        Schema::dropIfExists('crawler.discovery_runs');
        Schema::dropIfExists('crawler.crawler_runs');
    }
};
