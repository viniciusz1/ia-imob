<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Enforce ADR 0001 at the database: a User belongs to exactly one Tenant.
     * The column was introduced nullable (2026_06_05_000002) and the original
     * backfill only covered users that existed at that point, so later-created
     * users (seeds, admin-created brokers) could still be tenant-less. Backfill
     * any stragglers into a default Tenant, then make the column NOT NULL so the
     * invalid state becomes unrepresentable — mirroring property_valuations.
     */
    public function up(): void
    {
        if (DB::table('users')->whereNull('tenant_id')->exists()) {
            $tenantId = DB::table('tenants')->where('slug', 'default')->value('id')
                ?? DB::table('tenants')->insertGetId([
                    'name' => 'Imobiliária Padrão',
                    'slug' => 'default',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

            DB::table('users')->whereNull('tenant_id')->update(['tenant_id' => $tenantId]);

            if (DB::table('tenants')->where('id', $tenantId)->whereNull('owner_user_id')->exists()) {
                $ownerId = DB::table('users')->where('tenant_id', $tenantId)->min('id');
                DB::table('tenants')->where('id', $tenantId)->update(['owner_user_id' => $ownerId]);
            }
        }

        DB::statement('ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE users ALTER COLUMN tenant_id DROP NOT NULL');
    }
};
