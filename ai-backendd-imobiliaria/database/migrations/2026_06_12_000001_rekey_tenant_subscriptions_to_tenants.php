<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('asaas_customer_id', 50)->nullable()->after('owner_user_id');
        });

        DB::statement('
            UPDATE tenants
            SET asaas_customer_id = users.asaas_customer_id
            FROM users
            WHERE tenants.owner_user_id = users.id
              AND tenants.asaas_customer_id IS NULL
              AND users.asaas_customer_id IS NOT NULL
        ');

        Schema::table('tenant_subscriptions', function (Blueprint $table) {
            $table->foreignId('tenant_id')->nullable()->after('id')->constrained('tenants')->cascadeOnDelete();
        });

        DB::statement('
            UPDATE tenant_subscriptions
            SET tenant_id = users.tenant_id
            FROM users
            WHERE tenant_subscriptions.user_id = users.id
              AND tenant_subscriptions.tenant_id IS NULL
        ');

        DB::statement('ALTER TABLE tenant_subscriptions ALTER COLUMN tenant_id SET NOT NULL');

        Schema::table('tenant_subscriptions', function (Blueprint $table) {
            $table->dropIndex('tenant_subscriptions_user_id_status_index');
            $table->dropConstrainedForeignId('user_id');
            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('tenant_subscriptions', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
        });

        DB::statement('
            UPDATE tenant_subscriptions
            SET user_id = tenants.owner_user_id
            FROM tenants
            WHERE tenant_subscriptions.tenant_id = tenants.id
              AND tenant_subscriptions.user_id IS NULL
        ');

        Schema::table('tenant_subscriptions', function (Blueprint $table) {
            $table->dropIndex('tenant_subscriptions_tenant_id_status_index');
            $table->dropConstrainedForeignId('tenant_id');
            $table->index(['user_id', 'status']);
        });

        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn('asaas_customer_id');
        });
    }
};
