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
            $table->foreignId('agency_id')->nullable()->after('id')->constrained('agencies')->nullOnDelete();
        });

        // Backfill existing users into a single default Agency.
        if (DB::table('users')->whereNull('agency_id')->exists()) {
            $agencyId = DB::table('agencies')->where('slug', 'default')->value('id')
                ?? DB::table('agencies')->insertGetId([
                    'name' => 'Imobiliária Padrão',
                    'slug' => 'default',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

            DB::table('users')->whereNull('agency_id')->update(['agency_id' => $agencyId]);

            $ownerId = DB::table('users')->where('agency_id', $agencyId)->min('id');
            DB::table('agencies')->where('id', $agencyId)->update(['owner_user_id' => $ownerId]);
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('agency_id');
        });
    }
};
