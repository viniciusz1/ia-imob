<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agency_configurations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agency_id')->unique()->constrained()->cascadeOnDelete();
            $table->unsignedInteger('market_search_weekly_limit')->default(100);
            $table->timestamps();
        });

        $now = now();
        DB::table('agencies')
            ->select('id')
            ->orderBy('id')
            ->chunkById(500, function ($agencies) use ($now): void {
                DB::table('agency_configurations')->insert(
                    $agencies->map(fn ($agency): array => [
                        'agency_id' => $agency->id,
                        'market_search_weekly_limit' => 100,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ])->all()
                );
            });

        Schema::create('agency_market_search_usages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agency_id')->constrained()->cascadeOnDelete();
            $table->date('week_started_on');
            $table->unsignedInteger('used_count')->default(0);
            $table->timestamps();

            $table->unique(['agency_id', 'week_started_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agency_market_search_usages');
        Schema::dropIfExists('agency_configurations');
    }
};
