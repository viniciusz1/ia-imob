<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crawler.prospects', function (Blueprint $table) {
            $table->id();
            $table->string('root_domain')->nullable()->unique();
            $table->string('google_place_id')->nullable()->unique();
            $table->string('name');
            $table->string('city');
            $table->string('state', 2);
            $table->text('base_url')->nullable();
            $table->string('phone')->nullable();
            $table->text('address')->nullable();
            $table->string('source')->default('google_places');
            $table->string('automatic_classification', 32);
            $table->string('automatic_reason')->nullable();
            $table->string('review_state', 32)->default('pending');
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->timestampTz('reviewed_at')->nullable();
            $table->text('review_reason')->nullable();
            $table->unsignedBigInteger('promoted_crawl_agency_id')->nullable();
            $table->unsignedBigInteger('latest_operation_id')->nullable();
            $table->jsonb('metadata')->default('{}');
            $table->timestampsTz();
            $table->index(['city', 'state', 'review_state']);
            $table->index('automatic_classification');
        });
        Schema::create('crawler.onboarding_plans', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('prospect_id')->unique();
            $table->unsignedBigInteger('crawl_agency_id')->unique();
            $table->string('status')->default('draft');
            $table->jsonb('steps');
            $table->unsignedBigInteger('created_by');
            $table->timestampsTz();
        });

        DB::statement('ALTER TABLE crawler.prospects ADD CONSTRAINT prospect_reviewer_fk FOREIGN KEY (reviewed_by) REFERENCES users(id)');
        DB::statement('ALTER TABLE crawler.prospects ADD CONSTRAINT prospect_promoted_agency_fk FOREIGN KEY (promoted_crawl_agency_id) REFERENCES crawler.crawl_agencies(id)');
        DB::statement('ALTER TABLE crawler.prospects ADD CONSTRAINT prospect_latest_operation_fk FOREIGN KEY (latest_operation_id) REFERENCES crawler.operations(id)');
        DB::statement('ALTER TABLE crawler.onboarding_plans ADD CONSTRAINT onboarding_plan_prospect_fk FOREIGN KEY (prospect_id) REFERENCES crawler.prospects(id)');
        DB::statement('ALTER TABLE crawler.onboarding_plans ADD CONSTRAINT onboarding_plan_agency_fk FOREIGN KEY (crawl_agency_id) REFERENCES crawler.crawl_agencies(id)');
        DB::statement('ALTER TABLE crawler.onboarding_plans ADD CONSTRAINT onboarding_plan_creator_fk FOREIGN KEY (created_by) REFERENCES users(id)');
        DB::statement("ALTER TABLE crawler.prospects ADD CONSTRAINT prospect_classification_check CHECK (automatic_classification IN ('candidate', 'rejected'))");
        DB::statement("ALTER TABLE crawler.prospects ADD CONSTRAINT prospect_review_state_check CHECK (review_state IN ('pending', 'approved', 'rejected'))");
        DB::statement("ALTER TABLE crawler.onboarding_plans ADD CONSTRAINT onboarding_plan_status_check CHECK (status IN ('draft', 'in_progress', 'completed'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('crawler.onboarding_plans');
        Schema::dropIfExists('crawler.prospects');
    }
};
