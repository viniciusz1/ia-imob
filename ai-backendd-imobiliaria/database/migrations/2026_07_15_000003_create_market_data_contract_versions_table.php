<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crawler.market_data_contract_versions', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('version')->unique();
            $table->string('status')->default('draft');
            $table->jsonb('fields');
            $table->string('compatibility')->nullable();
            $table->jsonb('affected_agency_ids')->default('[]');
            $table->unsignedBigInteger('created_by');
            $table->unsignedBigInteger('activated_by')->nullable();
            $table->timestampTz('activated_at')->nullable();
            $table->timestampsTz();
            $table->index('status');
        });

        DB::statement("ALTER TABLE crawler.market_data_contract_versions ADD CONSTRAINT market_data_contract_status_check CHECK (status IN ('draft', 'validating', 'active', 'superseded'))");
        DB::statement("CREATE UNIQUE INDEX market_data_contract_single_active ON crawler.market_data_contract_versions (status) WHERE status = 'active'");
    }

    public function down(): void
    {
        Schema::dropIfExists('crawler.market_data_contract_versions');
    }
};
