<?php

namespace App\Services\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\CrawlAgencyCircuit;
use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\DiscoveryPolicyVersion;
use App\Models\Crawler\ExtractionProfile;
use App\Models\Crawler\OperationGroup;
use App\Models\Crawler\QualityPolicyVersion;
use App\Models\CrawlerRun;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class BulkProductionCrawlService
{
    public function __construct(
        private readonly ProductionCrawlService $production,
        private readonly ProductionBatchReader $batches,
    ) {}

    /**
     * @return array{
     *     summary: array{active_agencies: int, enqueued: int, skipped: int},
     *     group: OperationGroup|null,
     *     skipped: array<int, array{crawl_agency: array{id: int, name: string}, code: string, message: string}>
     * }
     */
    public function queueAllActive(User $requester, ?string $requestKey = null): array
    {
        return $this->queueTargets($requester, $requestKey ?? (string) Str::uuid());
    }

    public function queueTargets(User $requester, string $requestKey, ?array $agencyIds = null, ?int $sourceGroupId = null): array
    {
        $fingerprint = hash('sha256', json_encode([$sourceGroupId, $agencyIds], JSON_THROW_ON_ERROR));

        return DB::transaction(function () use ($requester, $requestKey, $agencyIds, $sourceGroupId, $fingerprint): array {
            DB::select('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))', ['batch:'.$requester->id.':'.$requestKey]);
            $existing = OperationGroup::query()->where('requested_by', $requester->id)->where('request_key', $requestKey)->first();
            if ($existing !== null) {
                if ($existing->request_fingerprint !== $fingerprint) {
                    throw ValidationException::withMessages(['request_key' => 'Esta chave já identifica outro comando.']);
                }

                return $this->resultFor($existing);
            }
            $agencies = CrawlAgency::query()
                ->when($agencyIds === null,
                    fn ($query) => $query->where('lifecycle_state', 'active'),
                    fn ($query) => $query->whereIn('id', $agencyIds))
                ->orderBy('id')->get();
            $group = OperationGroup::query()->create([
                'name' => $sourceGroupId === null ? 'Reexecução de crawls ativos' : 'Reexecução de problemas do lote #'.$sourceGroupId,
                'action' => 'bulk_production_crawl', 'requested_by' => $requester->id,
                'request_key' => $requestKey, 'request_fingerprint' => $fingerprint,
                'source_group_id' => $sourceGroupId, 'targets_complete' => true,
            ]);
            $hasActiveQualityPolicy = QualityPolicyVersion::query()
                ->where('status', 'active')
                ->exists();
            $operations = collect();

            foreach ($agencies as $agency) {
                $blocker = $agency->lifecycle_state !== 'active'
                    ? ['code' => 'agency_not_active', 'message' => 'A Crawl Agency não está ativa.']
                    : $this->blockerFor($agency, $hasActiveQualityPolicy);
                if ($blocker !== null) {
                    $this->recordTarget($group, $agency, null, $blocker);

                    continue;
                }

                try {
                    $operation = $this->production->queue([
                        'crawl_agency_id' => $agency->id,
                        'discovery_mode' => 'fresh',
                        'trigger' => 'manual_bulk',
                    ], $requester);
                    $operations->push($operation);
                    $this->recordTarget($group, $agency, $operation);
                } catch (ValidationException $exception) {
                    $raceBlocker = $this->blockerFor($agency->refresh(), $hasActiveQualityPolicy);
                    $blocker = $raceBlocker ?? [
                        'code' => 'configuration_invalid',
                        'message' => collect($exception->errors())->flatten()->first()
                            ?? 'A configuração ativa da Crawl Agency não permite iniciar um crawl.',
                    ];
                    $this->recordTarget($group, $agency, null, $blocker);
                }
            }

            $group->operations()->attach($operations->pluck('id'));

            return $this->resultFor($group);

        });
    }

    private function recordTarget(OperationGroup $group, CrawlAgency $agency, ?CrawlerOperation $operation, ?array $blocker = null): void
    {
        DB::table('crawler.operation_group_targets')->insert([
            'operation_group_id' => $group->id, 'crawl_agency_id' => $agency->id,
            'operation_id' => $operation?->id, 'name' => $agency->name, 'root_domain' => $agency->root_domain,
            'skip_code' => $blocker['code'] ?? null, 'skip_message' => $blocker['message'] ?? null,
            'created_at' => now(),
        ]);
    }

    private function resultFor(OperationGroup $group): array
    {
        $targets = DB::table('crawler.operation_group_targets')->where('operation_group_id', $group->id)->get();
        $skipped = $targets->whereNull('operation_id');

        return [
            'summary' => ['active_agencies' => $targets->count(), 'enqueued' => $targets->whereNotNull('operation_id')->count(), 'skipped' => $skipped->count()],
            'group' => $targets->whereNotNull('operation_id')->isEmpty() ? null : $group->load('operations'),
            'batch' => $this->batches->find($group->id),
            'skipped' => $skipped->map(fn ($item) => [
                'crawl_agency' => ['id' => $item->crawl_agency_id, 'name' => $item->name],
                'code' => $item->skip_code, 'message' => $item->skip_message,
            ])->values()->all(),
        ];
    }

    /**
     * @return array{code: string, message: string}|null
     */
    private function blockerFor(CrawlAgency $agency, bool $hasActiveQualityPolicy): ?array
    {
        if ($agency->revalidation_required) {
            return [
                'code' => 'revalidation_required',
                'message' => 'A Crawl Agency precisa ser revalidada antes de executar outro crawl.',
            ];
        }

        if (CrawlAgencyCircuit::query()
            ->where('crawl_agency_id', $agency->id)
            ->where('state', 'open')
            ->exists()) {
            return [
                'code' => 'circuit_open',
                'message' => 'A Crawl Agency está suspensa por circuito aberto.',
            ];
        }

        if (CrawlerOperation::query()
            ->where('crawl_agency_id', $agency->id)
            ->where('type', 'production_crawl')
            ->whereIn('state', ['queued', 'running', 'cancellation_requested'])
            ->exists()) {
            return [
                'code' => 'production_in_progress',
                'message' => 'Já existe um crawl de produção enfileirado ou em andamento.',
            ];
        }

        if (CrawlerRun::query()
            ->where('crawl_agency_id', $agency->id)
            ->where('publication_state', 'candidate')
            ->exists()) {
            return [
                'code' => 'candidate_snapshot_pending',
                'message' => 'Existe um Snapshot Candidato aguardando decisão em Qualidade.',
            ];
        }

        if ($agency->active_discovery_policy_version_id === null
            || ! DiscoveryPolicyVersion::query()
                ->whereKey($agency->active_discovery_policy_version_id)
                ->where('status', 'available')
                ->exists()) {
            return [
                'code' => 'missing_active_discovery_policy',
                'message' => 'Nenhuma Política de Discovery ativa e disponível foi encontrada.',
            ];
        }

        $profile = ExtractionProfile::query()
            ->where('crawl_agency_id', $agency->id)
            ->where('status', 'active')
            ->first();
        if ($profile === null) {
            return [
                'code' => 'missing_active_profile',
                'message' => 'Nenhum Perfil de Extração ativo foi encontrado.',
            ];
        }

        if ($profile->contract()->where('status', 'active')->doesntExist()) {
            return [
                'code' => 'inactive_contract',
                'message' => 'O Perfil de Extração ativo não aponta para um contrato ativo.',
            ];
        }

        if (! $hasActiveQualityPolicy) {
            return [
                'code' => 'missing_active_quality_policy',
                'message' => 'Nenhuma Política de Qualidade ativa foi encontrada.',
            ];
        }

        return null;
    }
}
