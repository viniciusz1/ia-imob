<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Initial hard cut: no production crawler data or legacy compatibility exists.
        DB::statement('DROP SCHEMA IF EXISTS crawler CASCADE');
        DB::statement('CREATE SCHEMA crawler');

        Schema::create('crawler.crawl_agencies', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('base_url');
            $table->string('root_domain')->unique();
            $table->string('lifecycle_state')->default('onboarding');
            $table->string('health_state')->default('unknown');
            $table->boolean('revalidation_required')->default(false);
            $table->timestampsTz();
            $table->index(['lifecycle_state', 'health_state']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crawler.crawl_agencies');
    }
};
