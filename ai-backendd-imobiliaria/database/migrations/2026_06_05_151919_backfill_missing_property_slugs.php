<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        $properties = DB::table('properties')
            ->whereNull('slug')
            ->orWhere('slug', '')
            ->orderBy('id')
            ->get();

        foreach ($properties as $property) {
            $baseSlug = Str::slug(implode(' ', array_filter([
                $property->purpose,
                $property->property_type,
                $property->bedrooms ? $property->bedrooms.' quartos' : null,
                $property->neighborhood,
                $property->city,
                'ref '.$property->reference_code,
            ]))) ?: 'imovel-'.$property->id;

            $slug = $baseSlug;
            $suffix = 2;

            while (
                DB::table('properties')
                    ->where('tenant_id', $property->tenant_id)
                    ->where('slug', $slug)
                    ->where('id', '<>', $property->id)
                    ->exists()
            ) {
                $slug = $baseSlug.'-'.$suffix;
                $suffix++;
            }

            DB::table('properties')
                ->where('id', $property->id)
                ->update(['slug' => $slug]);
        }
    }

    public function down(): void
    {
        // Data backfill only. Slugs are intentionally kept on rollback.
    }
};
