<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('crawler.discovery_strategies')->updateOrInsert(
            ['key' => 'playwright'],
            [
                'label' => 'Listagem e paginação (Playwright)',
                'kind' => 'native',
                'safety_status' => 'safe',
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );
    }

    public function down(): void
    {
        DB::table('crawler.discovery_strategies')
            ->where('key', 'playwright')
            ->where('kind', 'native')
            ->delete();
    }
};
