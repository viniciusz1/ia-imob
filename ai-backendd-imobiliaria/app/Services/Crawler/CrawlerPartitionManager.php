<?php

namespace App\Services\Crawler;

use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class CrawlerPartitionManager
{
    private const TABLES = [
        'raw_properties',
        'market_properties',
        'rejected_properties',
        'crawler_artifacts',
        'technical_logs',
    ];

    public function ensureMonths(CarbonInterface $start, int $months): void
    {
        foreach (range(0, max(0, $months - 1)) as $offset) {
            $from = $start->copy()->startOfMonth()->addMonths($offset);
            $to = $from->copy()->addMonth();
            foreach (self::TABLES as $table) {
                $partition = $table.'_'.$from->format('Y_m');
                DB::statement(sprintf(
                    "CREATE TABLE IF NOT EXISTS crawler.%s PARTITION OF crawler.%s FOR VALUES FROM ('%s') TO ('%s')",
                    $partition,
                    $table,
                    $from->toIso8601String(),
                    $to->toIso8601String(),
                ));
            }
        }
    }

    public function ensureDefaultPartitions(): void
    {
        foreach (self::TABLES as $table) {
            DB::statement("CREATE TABLE IF NOT EXISTS crawler.{$table}_default PARTITION OF crawler.{$table} DEFAULT");
        }
    }
}
