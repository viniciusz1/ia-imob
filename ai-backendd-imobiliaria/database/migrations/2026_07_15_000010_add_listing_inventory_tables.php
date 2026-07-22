<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crawler.listing_identities', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('crawl_agency_id');
            $table->string('listing_key', 255);
            $table->string('external_id')->nullable();
            $table->text('canonical_url')->nullable();
            $table->string('inventory_state', 32)->default('active');
            $table->unsignedInteger('consecutive_absences')->default(0);
            $table->string('absence_reason')->nullable();
            $table->unsignedBigInteger('current_version_id')->nullable();
            $table->unsignedBigInteger('current_market_property_id')->nullable();
            $table->unsignedBigInteger('last_seen_crawl_run_id')->nullable();
            $table->timestampTz('last_observed_at')->nullable();
            $table->timestampsTz();
            $table->unique(['crawl_agency_id', 'listing_key']);
            $table->index(['inventory_state', 'crawl_agency_id']);
            $table->index('current_market_property_id');
        });
        Schema::create('crawler.listing_versions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('listing_identity_id');
            $table->unsignedBigInteger('crawl_run_id');
            $table->unsignedBigInteger('market_property_id')->nullable();
            $table->string('classification', 32);
            $table->string('content_hash', 64)->nullable();
            $table->jsonb('observed_payload')->default('{}');
            $table->unsignedInteger('absence_count')->default(0);
            $table->string('reason')->nullable();
            $table->timestampTz('observed_at');
            $table->timestampTz('created_at')->useCurrent();
            $table->unique(['listing_identity_id', 'crawl_run_id']);
            $table->index(['crawl_run_id', 'classification']);
        });

        DB::statement('ALTER TABLE crawler.listing_identities ADD CONSTRAINT listing_identity_agency_fk FOREIGN KEY (crawl_agency_id) REFERENCES crawler.crawl_agencies(id)');
        DB::statement('ALTER TABLE crawler.listing_identities ADD CONSTRAINT listing_identity_last_run_fk FOREIGN KEY (last_seen_crawl_run_id) REFERENCES crawler.crawl_runs(id)');
        DB::statement('ALTER TABLE crawler.listing_versions ADD CONSTRAINT listing_version_identity_fk FOREIGN KEY (listing_identity_id) REFERENCES crawler.listing_identities(id)');
        DB::statement('ALTER TABLE crawler.listing_versions ADD CONSTRAINT listing_version_run_fk FOREIGN KEY (crawl_run_id) REFERENCES crawler.crawl_runs(id)');
        DB::statement('ALTER TABLE crawler.listing_identities ADD CONSTRAINT listing_identity_current_version_fk FOREIGN KEY (current_version_id) REFERENCES crawler.listing_versions(id)');
        DB::statement("ALTER TABLE crawler.listing_identities ADD CONSTRAINT listing_inventory_state_check CHECK (inventory_state IN ('active', 'missing', 'removed'))");
        DB::statement("ALTER TABLE crawler.listing_versions ADD CONSTRAINT listing_version_classification_check CHECK (classification IN ('new', 'changed', 'unchanged', 'missing', 'removed', 'reappeared'))");
    }

    public function down(): void
    {
        Schema::table('crawler.listing_identities', function (Blueprint $table) {
            $table->dropForeign('listing_identity_current_version_fk');
        });
        Schema::dropIfExists('crawler.listing_versions');
        Schema::dropIfExists('crawler.listing_identities');
    }
};
