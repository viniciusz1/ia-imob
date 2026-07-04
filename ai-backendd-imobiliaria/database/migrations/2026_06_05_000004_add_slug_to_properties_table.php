<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->string('slug')->nullable()->after('reference_code');
        });

        // Backfill slugs for existing properties.
        foreach (DB::table('properties')->whereNull('slug')->get() as $p) {
            $segments = array_filter([
                $p->purpose,
                $p->property_type,
                $p->bedrooms ? $p->bedrooms.' quartos' : null,
                $p->neighborhood,
                $p->city,
                'ref '.$p->reference_code,
            ]);

            DB::table('properties')->where('id', $p->id)->update([
                'slug' => Str::slug(implode(' ', $segments)),
            ]);
        }

        Schema::table('properties', function (Blueprint $table) {
            $table->unique(['agency_id', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->dropUnique(['agency_id', 'slug']);
            $table->dropColumn('slug');
        });
    }
};
