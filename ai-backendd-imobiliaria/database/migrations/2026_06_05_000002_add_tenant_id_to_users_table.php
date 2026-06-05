<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('tenant_id')->nullable()->after('id')->constrained('tenants')->nullOnDelete();
        });

        // Backfill existing users into a single default Tenant.
        if (DB::table('users')->whereNull('tenant_id')->exists()) {
            $tenantId = DB::table('tenants')->where('slug', 'default')->value('id')
                ?? DB::table('tenants')->insertGetId([
                    'name' => 'Imobiliária Padrão',
                    'slug' => 'default',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

            DB::table('users')->whereNull('tenant_id')->update(['tenant_id' => $tenantId]);

            $ownerId = DB::table('users')->where('tenant_id', $tenantId)->min('id');
            DB::table('tenants')->where('id', $tenantId)->update(['owner_user_id' => $ownerId]);
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('tenant_id');
        });
    }
};
