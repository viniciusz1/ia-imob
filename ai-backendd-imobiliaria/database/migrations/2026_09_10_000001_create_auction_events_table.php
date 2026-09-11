<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('auction_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crawl_agency_id')->constrained('crawler.crawl_agencies')->cascadeOnDelete();
            $table->string('external_key')->index();
            $table->string('canonical_url', 1024)->nullable();
            
            $table->string('title');
            $table->string('sale_modality')->default('unknown'); // judicial, extrajudicial, administrative, direct_sale, unknown
            $table->string('status')->default('unknown'); // scheduled, open, closed, cancelled, unknown
            $table->string('auctioneer_name')->nullable();
            $table->string('court_or_seller')->nullable();
            
            $table->timestampTz('published_at')->nullable();
            $table->jsonb('source_payload')->nullable();
            
            $table->timestampTz('first_observed_at')->nullable();
            $table->timestampTz('last_observed_at')->nullable();
            $table->timestamps();

            $table->unique(['crawl_agency_id', 'external_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auction_events');
    }
};
