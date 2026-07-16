<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crawler.prospect_operation_observations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('prospect_id');
            $table->unsignedBigInteger('operation_id');
            $table->string('city');
            $table->string('state', 2);
            $table->string('automatic_classification', 32);
            $table->jsonb('metadata')->default('{}');
            $table->timestampTz('observed_at');
            $table->unique(['prospect_id', 'operation_id']);
            $table->index(['operation_id', 'city']);
        });
        Schema::create('crawler.crawl_agency_suggestions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('crawl_agency_id');
            $table->unsignedBigInteger('operation_id');
            $table->jsonb('differences');
            $table->string('state')->default('pending');
            $table->timestampTz('created_at')->useCurrent();
            $table->unique(['crawl_agency_id', 'operation_id']);
            $table->index(['state', 'crawl_agency_id']);
        });

        DB::statement('ALTER TABLE crawler.prospect_operation_observations ADD CONSTRAINT prospect_observation_prospect_fk FOREIGN KEY (prospect_id) REFERENCES crawler.prospects(id)');
        DB::statement('ALTER TABLE crawler.prospect_operation_observations ADD CONSTRAINT prospect_observation_operation_fk FOREIGN KEY (operation_id) REFERENCES crawler.operations(id)');
        DB::statement('ALTER TABLE crawler.crawl_agency_suggestions ADD CONSTRAINT agency_suggestion_agency_fk FOREIGN KEY (crawl_agency_id) REFERENCES crawler.crawl_agencies(id)');
        DB::statement('ALTER TABLE crawler.crawl_agency_suggestions ADD CONSTRAINT agency_suggestion_operation_fk FOREIGN KEY (operation_id) REFERENCES crawler.operations(id)');
        DB::statement("ALTER TABLE crawler.crawl_agency_suggestions ADD CONSTRAINT agency_suggestion_state_check CHECK (state IN ('pending', 'accepted', 'dismissed'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('crawler.crawl_agency_suggestions');
        Schema::dropIfExists('crawler.prospect_operation_observations');
    }
};
