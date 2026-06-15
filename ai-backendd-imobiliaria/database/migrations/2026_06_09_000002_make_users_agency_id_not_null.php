<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Enforce ADR 0001 at the database: a User belongs to exactly one Agency.
     * The column was introduced nullable (2026_06_05_000002) and the original
     * backfill only covered users that existed at that point, so later-created
     * users (seeds, admin-created brokers) could still be agency-less. Backfill
     * any stragglers into a default Agency, then make the column NOT NULL so the
     * invalid state becomes unrepresentable — mirroring property_valuations.
     */
    public function up(): void
    {
        if (DB::table('users')->whereNull('agency_id')->exists()) {
            $agencyId = DB::table('agencies')->where('slug', 'default')->value('id')
                ?? DB::table('agencies')->insertGetId([
                    'name' => 'Imobiliária Padrão',
                    'slug' => 'default',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

            DB::table('users')->whereNull('agency_id')->update(['agency_id' => $agencyId]);

            if (DB::table('agencies')->where('id', $agencyId)->whereNull('owner_user_id')->exists()) {
                $ownerId = DB::table('users')->where('agency_id', $agencyId)->min('id');
                DB::table('agencies')->where('id', $agencyId)->update(['owner_user_id' => $ownerId]);
            }
        }

        DB::statement('ALTER TABLE users ALTER COLUMN agency_id SET NOT NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE users ALTER COLUMN agency_id DROP NOT NULL');
    }
};
