<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crawler.extraction_profiles', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('crawl_agency_id');
            $table->unsignedBigInteger('discovery_snapshot_id');
            $table->unsignedBigInteger('market_data_contract_version_id');
            $table->unsignedBigInteger('created_by_operation_id')->unique();
            $table->unsignedInteger('version');
            $table->string('status')->default('candidate');
            $table->text('sample_url');
            $table->jsonb('schemas');
            $table->jsonb('strategies')->default('[]');
            $table->jsonb('fields');
            $table->jsonb('parameters')->default('{}');
            $table->unsignedBigInteger('decided_by')->nullable();
            $table->timestampTz('decided_at')->nullable();
            $table->text('decision_reason')->nullable();
            $table->timestampsTz();
            $table->unique(['crawl_agency_id', 'version']);
            $table->index(['crawl_agency_id', 'status']);
        });

        DB::statement("ALTER TABLE crawler.extraction_profiles ADD CONSTRAINT extraction_profile_status_check CHECK (status IN ('candidate', 'approved', 'rejected', 'active', 'revalidation_required'))");
        DB::statement('ALTER TABLE crawler.extraction_profiles ADD CONSTRAINT extraction_profile_agency_fk FOREIGN KEY (crawl_agency_id) REFERENCES crawler.crawl_agencies(id)');
        DB::statement('ALTER TABLE crawler.extraction_profiles ADD CONSTRAINT extraction_profile_discovery_fk FOREIGN KEY (discovery_snapshot_id) REFERENCES crawler.discovery_snapshots(id)');
        DB::statement('ALTER TABLE crawler.extraction_profiles ADD CONSTRAINT extraction_profile_contract_fk FOREIGN KEY (market_data_contract_version_id) REFERENCES crawler.market_data_contract_versions(id)');
        DB::statement('ALTER TABLE crawler.extraction_profiles ADD CONSTRAINT extraction_profile_operation_fk FOREIGN KEY (created_by_operation_id) REFERENCES crawler.operations(id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('crawler.extraction_profiles');
    }
};
