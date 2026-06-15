<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->foreignId('agency_id')->nullable()->after('id')->constrained('agencies')->nullOnDelete();
            $table->index('agency_id');
        });

        // Backfill existing properties into the default Agency.
        if (DB::table('properties')->whereNull('agency_id')->exists()) {
            $agencyId = DB::table('agencies')->where('slug', 'default')->value('id')
                ?? DB::table('agencies')->insertGetId([
                    'name' => 'Imobiliária Padrão',
                    'slug' => 'default',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

            DB::table('properties')->whereNull('agency_id')->update(['agency_id' => $agencyId]);
        }
    }

    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->dropConstrainedForeignId('agency_id');
        });
    }
};
