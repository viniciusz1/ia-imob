<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('crawler.crawl_agencies', function (Blueprint $table) {
            $table->string('city')->nullable()->after('root_domain');
            $table->string('state', 2)->nullable()->after('city');
            $table->index(['city', 'state']);
        });

        DB::statement('
            UPDATE crawler.crawl_agencies AS ca
            SET
                city = COALESCE(ca.city, p.city),
                state = COALESCE(ca.state, p.state)
            FROM crawler.prospects AS p
            WHERE (p.promoted_crawl_agency_id = ca.id OR LOWER(p.root_domain) = LOWER(ca.root_domain))
              AND (ca.city IS NULL OR ca.state IS NULL)
        ');
    }

    public function down(): void
    {
        Schema::table('crawler.crawl_agencies', function (Blueprint $table) {
            $table->dropIndex(['city', 'state']);
            $table->dropColumn(['city', 'state']);
        });
    }
};
