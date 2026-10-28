<?php

namespace App\Services\Crawler;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OperationDiagnosticRecorder
{
    public function record(int $operationId, string $stage, string $outcome, ?string $errorCode = null): void
    {
        DB::table('crawler.operation_diagnostics')->insert([
            'event_id' => (string) Str::uuid(), 'operation_id' => $operationId,
            'kind' => 'stage', 'stage' => $stage, 'outcome' => $outcome,
            'error_code' => $errorCode, 'created_at' => now(),
        ]);
    }
}
