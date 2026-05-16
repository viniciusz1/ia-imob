<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wsm_agencies', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->text('url');
            $table->text('url_pagination_template');
            $table->string('total_pages_selector_type', 16);
            $table->text('total_pages_selector_value');
            $table->text('total_pages_formula')->nullable();
            $table->string('cards_to_iterate_selector_type', 16);
            $table->text('cards_to_iterate_selector_value');
            $table->boolean('is_active')->default(true);
            $table->integer('expected_min_items')->nullable();
            $table->timestamps();
        });

        Schema::create('sitemap_agencies', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('domain')->unique();
            $table->text('sitemap_url');
            $table->text('allowed_url_patterns')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('expected_min_items')->nullable();
            $table->timestamps();
        });

        Schema::create('agency_field_extractors', function (Blueprint $table) {
            $table->id();
            $table->string('agency_type', 16);
            $table->unsignedBigInteger('agency_id');
            $table->string('field_name', 64);
            $table->integer('priority')->default(1);
            $table->string('source_type', 16);
            $table->text('selector_value');
            $table->integer('selector_index')->nullable();
            $table->jsonb('selector_params')->nullable();
            $table->boolean('selector_join')->default(false);
            $table->text('pipeline')->nullable();
            $table->string('output_type', 16);
            $table->boolean('is_optional')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agency_field_extractors');
        Schema::dropIfExists('sitemap_agencies');
        Schema::dropIfExists('wsm_agencies');
    }
};
