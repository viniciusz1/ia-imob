<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agencies', function (Blueprint $table) {
            $table->string('asaas_customer_id', 50)->nullable()->after('owner_user_id');
        });

        DB::statement('
            UPDATE agencies
            SET asaas_customer_id = users.asaas_customer_id
            FROM users
            WHERE agencies.owner_user_id = users.id
              AND agencies.asaas_customer_id IS NULL
              AND users.asaas_customer_id IS NOT NULL
        ');

        Schema::table('agency_subscriptions', function (Blueprint $table) {
            $table->foreignId('agency_id')->nullable()->after('id')->constrained('agencies')->cascadeOnDelete();
        });

        DB::statement('
            UPDATE agency_subscriptions
            SET agency_id = users.agency_id
            FROM users
            WHERE agency_subscriptions.user_id = users.id
              AND agency_subscriptions.agency_id IS NULL
        ');

        DB::statement('ALTER TABLE agency_subscriptions ALTER COLUMN agency_id SET NOT NULL');

        Schema::table('agency_subscriptions', function (Blueprint $table) {
            $table->dropIndex('agency_subscriptions_user_id_status_index');
            $table->dropConstrainedForeignId('user_id');
            $table->index(['agency_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('agency_subscriptions', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
        });

        DB::statement('
            UPDATE agency_subscriptions
            SET user_id = agencies.owner_user_id
            FROM agencies
            WHERE agency_subscriptions.agency_id = agencies.id
              AND agency_subscriptions.user_id IS NULL
        ');

        Schema::table('agency_subscriptions', function (Blueprint $table) {
            $table->dropIndex('agency_subscriptions_agency_id_status_index');
            $table->dropConstrainedForeignId('agency_id');
            $table->index(['user_id', 'status']);
        });

        Schema::table('agencies', function (Blueprint $table) {
            $table->dropColumn('asaas_customer_id');
        });
    }
};
