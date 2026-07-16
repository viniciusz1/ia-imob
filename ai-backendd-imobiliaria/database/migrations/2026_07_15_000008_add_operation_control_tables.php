<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('crawler.operations', function (Blueprint $table) {
            $table->unsignedBigInteger('retry_of_operation_id')->nullable();
            $table->string('equivalence_key', 64)->nullable();
            $table->timestampTz('cancellation_requested_at')->nullable();
            $table->timestampTz('timed_out_at')->nullable();
            $table->index('retry_of_operation_id');
        });
        DB::statement('ALTER TABLE crawler.operations ADD CONSTRAINT crawler_operation_retry_fk FOREIGN KEY (retry_of_operation_id) REFERENCES crawler.operations(id)');
        DB::statement("CREATE UNIQUE INDEX crawler_one_active_crawl_per_agency ON crawler.operations (crawl_agency_id) WHERE type = 'production_crawl' AND state IN ('running', 'cancellation_requested')");
        DB::statement("CREATE UNIQUE INDEX crawler_one_equivalent_pending_crawl ON crawler.operations (crawl_agency_id, equivalence_key) WHERE type = 'production_crawl' AND state = 'queued'");

        Schema::create('crawler.operation_groups', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('action')->default('aggregate');
            $table->unsignedBigInteger('requested_by');
            $table->timestampsTz();
        });
        Schema::create('crawler.operation_group_members', function (Blueprint $table) {
            $table->unsignedBigInteger('operation_group_id');
            $table->unsignedBigInteger('operation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->primary(['operation_group_id', 'operation_id']);
        });
        DB::statement('ALTER TABLE crawler.operation_groups ADD CONSTRAINT operation_group_user_fk FOREIGN KEY (requested_by) REFERENCES users(id)');
        DB::statement('ALTER TABLE crawler.operation_group_members ADD CONSTRAINT operation_group_member_group_fk FOREIGN KEY (operation_group_id) REFERENCES crawler.operation_groups(id)');
        DB::statement('ALTER TABLE crawler.operation_group_members ADD CONSTRAINT operation_group_member_operation_fk FOREIGN KEY (operation_id) REFERENCES crawler.operations(id)');
    }

    public function down(): void
    {
        Schema::dropIfExists('crawler.operation_group_members');
        Schema::dropIfExists('crawler.operation_groups');
        DB::statement('DROP INDEX IF EXISTS crawler.crawler_one_equivalent_pending_crawl');
        DB::statement('DROP INDEX IF EXISTS crawler.crawler_one_active_crawl_per_agency');
        Schema::table('crawler.operations', function (Blueprint $table) {
            $table->dropColumn(['retry_of_operation_id', 'equivalence_key', 'cancellation_requested_at', 'timed_out_at']);
        });
    }
};
