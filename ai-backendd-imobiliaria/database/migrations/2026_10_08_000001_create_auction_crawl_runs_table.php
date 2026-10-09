<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Auction Crawl Runs: one execution of the Python sitemap crawler for an
 * Auction Crawler Source. The Python worker claims queued runs over HTTP,
 * streams progress/log lines into the row and posts the extracted lots.
 *
 * Auction events also stop requiring a Crawl Agency: auction sources are a
 * different domain from real-estate Crawl Agencies, so events now belong to
 * either one of them.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('auction_crawler_sources', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::create('auction_crawl_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('auction_crawler_source_id')->constrained('auction_crawler_sources')->cascadeOnDelete();
            $table->foreignId('triggered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status')->default('queued')->index();
            $table->string('stage')->nullable();
            $table->string('worker_key')->nullable();
            $table->unsignedInteger('sitemaps_read')->default(0);
            $table->unsignedInteger('urls_found')->default(0);
            $table->unsignedInteger('urls_total')->default(0);
            $table->unsignedInteger('processed')->default(0);
            $table->unsignedInteger('ingested')->default(0);
            $table->unsignedInteger('failed')->default(0);
            $table->jsonb('log')->default('[]');
            $table->text('error')->nullable();
            $table->timestampTz('started_at')->nullable();
            $table->timestampTz('heartbeat_at')->nullable();
            $table->timestampTz('cancel_requested_at')->nullable();
            $table->timestampTz('finished_at')->nullable();
            $table->timestamps();

            $table->index(['auction_crawler_source_id', 'created_at']);
        });

        Schema::table('auction_events', function (Blueprint $table) {
            $table->unsignedBigInteger('crawl_agency_id')->nullable()->change();
            $table->foreignId('auction_crawler_source_id')->nullable()->after('crawl_agency_id')
                ->constrained('auction_crawler_sources')->cascadeOnDelete();
            $table->unique(['auction_crawler_source_id', 'external_key']);
        });
    }

    public function down(): void
    {
        Schema::table('auction_events', function (Blueprint $table) {
            $table->dropUnique(['auction_crawler_source_id', 'external_key']);
            $table->dropConstrainedForeignId('auction_crawler_source_id');
        });

        Schema::dropIfExists('auction_crawl_runs');

        Schema::table('auction_crawler_sources', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
