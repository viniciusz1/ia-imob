<?php

declare(strict_types=1);

namespace App\Services\Auction;

use App\Enums\Auction\AuctionCrawlRunStatus;
use App\Models\AuctionCrawlerSource;
use App\Models\AuctionCrawlRun;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Lifecycle of an Auction Crawl Run, shared by the admin UI (queue/cancel)
 * and the Python worker (claim/progress/records/finish).
 */
class AuctionCrawlRunService
{
    private const WORKER_CACHE_KEY = 'auction_crawler:worker';

    private const STALE_AFTER_SECONDS = 180;

    public function __construct(private readonly AuctionRecordIngestor $ingestor) {}

    public function queue(AuctionCrawlerSource $source, ?User $user): AuctionCrawlRun
    {
        if (! $source->is_active) {
            throw ValidationException::withMessages(['source' => 'A fonte está desativada.']);
        }

        return DB::transaction(function () use ($source, $user): AuctionCrawlRun {
            $active = $source->runs()
                ->whereIn('status', AuctionCrawlRunStatus::activeValues())
                ->exists();

            if ($active) {
                throw ValidationException::withMessages(['source' => 'Já existe uma execução em andamento para esta fonte.']);
            }

            $run = new AuctionCrawlRun([
                'status' => AuctionCrawlRunStatus::Queued,
                'stage' => 'Aguardando o worker Python',
                'triggered_by' => $user?->id,
            ]);
            $run->appendLog([['level' => 'info', 'message' => 'Execução enfileirada.']]);
            $source->runs()->save($run);
            $source->update(['last_run_at' => now()]);

            return $run;
        });
    }

    public function cancel(AuctionCrawlRun $run): AuctionCrawlRun
    {
        if (! $run->status->isActive()) {
            throw ValidationException::withMessages(['run' => 'Esta execução já foi finalizada.']);
        }

        if ($run->status === AuctionCrawlRunStatus::Queued) {
            $run->fill([
                'status' => AuctionCrawlRunStatus::Cancelled,
                'stage' => 'Cancelado antes de iniciar',
                'finished_at' => now(),
            ]);
        } else {
            $run->cancel_requested_at = now();
            $run->stage = 'Cancelamento solicitado';
        }

        $run->appendLog([['level' => 'warning', 'message' => 'Cancelamento solicitado pelo usuário.']]);
        $run->save();

        return $run;
    }

    /**
     * Claims the oldest queued run for the worker. Also refreshes the worker
     * presence and fails runs whose worker stopped sending heartbeats.
     */
    public function claim(string $workerKey): ?AuctionCrawlRun
    {
        Cache::put(self::WORKER_CACHE_KEY, [
            'worker_key' => $workerKey,
            'seen_at' => now()->toIso8601String(),
        ], now()->addMinutes(5));

        $this->failStaleRuns();

        return DB::transaction(function () use ($workerKey): ?AuctionCrawlRun {
            /** @var AuctionCrawlRun|null $run */
            $run = AuctionCrawlRun::query()
                ->where('status', AuctionCrawlRunStatus::Queued->value)
                ->orderBy('id')
                ->lockForUpdate()
                ->first();

            if ($run === null) {
                return null;
            }

            $run->fill([
                'status' => AuctionCrawlRunStatus::Running,
                'worker_key' => $workerKey,
                'stage' => 'Iniciando',
                'started_at' => now(),
                'heartbeat_at' => now(),
            ]);
            $run->appendLog([['level' => 'info', 'message' => "Worker {$workerKey} assumiu a execução."]]);
            $run->save();

            return $run->load('source');
        });
    }

    /**
     * @param  array{stage?: string|null, sitemaps_read?: int, urls_found?: int, urls_total?: int, processed?: int, failed?: int, log?: list<array{at?: string, level?: string, message: string}>}  $progress
     */
    public function progress(AuctionCrawlRun $run, array $progress): AuctionCrawlRun
    {
        $this->assertRunning($run);

        foreach (['sitemaps_read', 'urls_found', 'urls_total', 'processed', 'failed'] as $counter) {
            if (array_key_exists($counter, $progress)) {
                $run->{$counter} = (int) $progress[$counter];
            }
        }

        if (array_key_exists('stage', $progress)) {
            $run->stage = $progress['stage'];
        }

        $run->appendLog($progress['log'] ?? []);
        $run->heartbeat_at = now();
        $run->save();

        return $run;
    }

    /**
     * @param  list<mixed>  $records
     * @return array{ingested: int, failed: int}
     */
    public function ingestRecords(AuctionCrawlRun $run, array $records): array
    {
        $this->assertRunning($run);

        $ingested = 0;
        $failed = 0;
        $log = [];

        foreach ($records as $record) {
            $payload = is_array($record) ? $record : [];
            $url = $payload['source']['canonical_url'] ?? $payload['source']['external_id'] ?? '?';

            $validator = Validator::make($payload, AuctionRecordIngestor::rules());
            if ($validator->fails()) {
                $failed++;
                $log[] = ['level' => 'error', 'message' => "Registro inválido {$url}: ".implode(' ', $validator->errors()->all())];

                continue;
            }

            try {
                $this->ingestor->ingest($validator->validated(), sourceId: $run->auction_crawler_source_id);
                $ingested++;
            } catch (Throwable $exception) {
                $failed++;
                $log[] = ['level' => 'error', 'message' => "Falha ao gravar {$url}: {$exception->getMessage()}"];
                Log::warning('auction_record_ingestion_failed', ['run_id' => $run->id, 'error' => $exception->getMessage()]);
            }
        }

        $run->ingested += $ingested;
        $run->failed += $failed;
        $run->heartbeat_at = now();
        $run->appendLog($log);
        $run->save();

        return ['ingested' => $ingested, 'failed' => $failed];
    }

    public function finish(AuctionCrawlRun $run, AuctionCrawlRunStatus $status, ?string $error = null): AuctionCrawlRun
    {
        if (! $run->status->isActive()) {
            return $run;
        }

        $message = match ($status) {
            AuctionCrawlRunStatus::Succeeded => "Concluído: {$run->ingested} lotes gravados, {$run->failed} falhas.",
            AuctionCrawlRunStatus::Cancelled => 'Execução cancelada.',
            default => 'Execução falhou: '.($error ?? 'erro desconhecido'),
        };

        $run->fill([
            'status' => $status,
            'stage' => $status->label(),
            'error' => $error,
            'finished_at' => now(),
            'heartbeat_at' => now(),
        ]);
        $run->appendLog([[
            'level' => $status === AuctionCrawlRunStatus::Succeeded ? 'success' : ($status === AuctionCrawlRunStatus::Cancelled ? 'warning' : 'error'),
            'message' => $message,
        ]]);
        $run->save();

        return $run;
    }

    /**
     * @return array{online: bool, worker_key: string|null, last_seen_at: string|null}
     */
    public function workerStatus(): array
    {
        /** @var array{worker_key: string, seen_at: string}|null $worker */
        $worker = Cache::get(self::WORKER_CACHE_KEY);

        if ($worker === null) {
            return ['online' => false, 'worker_key' => null, 'last_seen_at' => null];
        }

        return [
            'online' => Carbon::parse($worker['seen_at'])->gt(now()->subSeconds(30)),
            'worker_key' => $worker['worker_key'],
            'last_seen_at' => $worker['seen_at'],
        ];
    }

    private function assertRunning(AuctionCrawlRun $run): void
    {
        if ($run->status !== AuctionCrawlRunStatus::Running) {
            throw ValidationException::withMessages(['run' => 'A execução não está em andamento.']);
        }
    }

    private function failStaleRuns(): void
    {
        AuctionCrawlRun::query()
            ->where('status', AuctionCrawlRunStatus::Running->value)
            ->where('heartbeat_at', '<', now()->subSeconds(self::STALE_AFTER_SECONDS))
            ->get()
            ->each(fn (AuctionCrawlRun $run) => $this->finish(
                $run,
                AuctionCrawlRunStatus::Failed,
                'O worker parou de responder (sem heartbeat).'
            ));
    }
}
