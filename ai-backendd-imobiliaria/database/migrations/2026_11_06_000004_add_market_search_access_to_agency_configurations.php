<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agency_configurations', function (Blueprint $table): void {
            $table->json('allowed_cities')->nullable();
            $table->json('allowed_crawl_agency_ids')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('agency_configurations', function (Blueprint $table): void {
            $table->dropColumn(['allowed_cities', 'allowed_crawl_agency_ids']);
        });
    }
};
