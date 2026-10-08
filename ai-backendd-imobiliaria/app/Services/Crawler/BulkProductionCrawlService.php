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
use Illuminate\Validation\ValidationException;

class BulkProductionCrawlService
{
    public function __construct(
        private readonly ProductionCrawlService $production,
        private readonly CrawlerOperationControlService $operationControl,
    ) {}

    /**
     * @return array{
     *     summary: array{active_agencies: int, enqueued: int, skipped: int},
     *     group: OperationGroup|null,
     *     skipped: array<int, array{crawl_agency: array{id: int, name: string}, code: string, message: string}>
     * }
     */
    public function queueAllActive(User $requester): array
    {
        return DB::transaction(function () use ($requester): array {
            $agencies = CrawlAgency::query()
                ->where('lifecycle_state', 'active')
                ->orderBy('id')
                ->get();
            $hasActiveQualityPolicy = QualityPolicyVersion::query()
                ->where('status', 'active')
                ->exists();
            $operations = collect();
            $skipped = [];

            foreach ($agencies as $agency) {
                $blocker = $this->blockerFor($agency, $hasActiveQualityPolicy);
                if ($blocker !== null) {
                    $skipped[] = $this->skippedAgency($agency, $blocker);

                    continue;
                }

                try {
                    $operations->push($this->production->queue([
                        'crawl_agency_id' => $agency->id,
                        'discovery_mode' => 'fresh',
                        'trigger' => 'manual_bulk',
                    ], $requester));
                } catch (ValidationException $exception) {
                    $raceBlocker = $this->blockerFor($agency->refresh(), $hasActiveQualityPolicy);
                    $skipped[] = $this->skippedAgency($agency, $raceBlocker ?? [
                        'code' => 'configuration_invalid',
                        'message' => collect($exception->errors())->flatten()->first()
                            ?? 'A configuração ativa da Crawl Agency não permite iniciar um crawl.',
                    ]);
                }
            }

            $group = $operations->isEmpty()
                ? null
                : $this->operationControl->createGroup(
                    'Reexecução de crawls ativos',
                    $operations->pluck('id')->all(),
                    $requester,
                    'bulk_production_crawl',
                );

            return [
                'summary' => [
                    'active_agencies' => $agencies->count(),
                    'enqueued' => $operations->count(),
                    'skipped' => count($skipped),
                ],
                'group' => $group,
                'skipped' => $skipped,
            ];
        });
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

    /**
     * @param  array{code: string, message: string}  $blocker
     * @return array{crawl_agency: array{id: int, name: string}, code: string, message: string}
     */
    private function skippedAgency(CrawlAgency $agency, array $blocker): array
    {
        return [
            'crawl_agency' => [
                'id' => $agency->id,
                'name' => $agency->name,
            ],
            ...$blocker,
        ];
    }
}
