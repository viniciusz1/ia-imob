<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Allow Platform Admin users to exist without an Agency.
     * ADR-0006 / Issue #42: Platform Admins are deliberately agency-less.
     */
    public function up(): void
    {
        DB::statement('ALTER TABLE users ALTER COLUMN agency_id DROP NOT NULL');
    }

    /**
     * Backfill any null agency_id users into a default Agency, then
     * reinstate the NOT NULL constraint.
     */
    public function down(): void
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
        }

        DB::statement('ALTER TABLE users ALTER COLUMN agency_id SET NOT NULL');
    }
};
