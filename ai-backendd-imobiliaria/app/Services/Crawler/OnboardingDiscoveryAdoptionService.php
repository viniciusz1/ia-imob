<?php

namespace App\Services\Crawler;

use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\DiscoverySnapshot;
use App\Models\Crawler\OnboardingDiscoveryAdoption;
use App\Models\Crawler\OnboardingExecution;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OnboardingDiscoveryAdoptionService
{
    public function __construct(private readonly OnboardingExecutionCoordinator $coordinator) {}

    public function adopt(
        OnboardingExecution $execution,
        DiscoverySnapshot $snapshot,
        User $actor,
        ?string $note,
    ): OnboardingExecution {
        $execution = DB::transaction(function () use ($actor, $execution, $note, $snapshot): OnboardingExecution {
            $locked = OnboardingExecution::query()
                ->with('crawlAgency')
                ->lockForUpdate()
                ->findOrFail($execution->id);
            $existingAdoption = OnboardingDiscoveryAdoption::query()
                ->where('onboarding_execution_id', $locked->id)
                ->first();
            if ($existingAdoption !== null) {
                if ($existingAdoption->discovery_snapshot_id !== $snapshot->id) {
                    throw ValidationException::withMessages([
                        'discovery_snapshot_id' => 'This execution already adopted another Discovery Snapshot.',
                    ]);
                }

                return $locked;
            }

            if ($locked->state !== 'requires_attention' || $locked->current_step !== 'discovery') {
                throw ValidationException::withMessages([
                    'state' => 'A Discovery Snapshot can only be adopted while the Discovery step requires attention.',
                ]);
            }
            if ($snapshot->crawl_agency_id !== $locked->crawl_agency_id) {
                throw ValidationException::withMessages([
                    'discovery_snapshot_id' => 'Select a Discovery Snapshot from the same Crawl Agency.',
                ]);
            }

            $sourceOperation = CrawlerOperation::query()->find($snapshot->operation_id);
            if (
                $sourceOperation === null
                || $sourceOperation->crawl_agency_id !== $locked->crawl_agency_id
                || $sourceOperation->type !== 'discovery'
                || $sourceOperation->state !== 'succeeded'
            ) {
                throw ValidationException::withMessages([
                    'discovery_snapshot_id' => 'The Snapshot must come from a successful Discovery operation.',
                ]);
            }
            if ($locked->operations()->where('onboarding_step', '!=', 'discovery')->exists()) {
                throw ValidationException::withMessages([
                    'state' => 'A Snapshot cannot be adopted after a later onboarding step has started.',
                ]);
            }

            $sampleUrl = $this->selectSampleUrl($snapshot, $locked->crawlAgency->root_domain);
            if ($sampleUrl === null) {
                throw ValidationException::withMessages([
                    'discovery_snapshot_id' => 'The Snapshot has no eligible HTTP(S) sample URL for this Crawl Agency.',
                ]);
            }
            $replacedOperation = $locked->operations()
                ->where('onboarding_step', 'discovery')
                ->whereIn('state', ['failed', 'cancelled'])
                ->latest('attempt')
                ->firstOrFail();

            OnboardingDiscoveryAdoption::query()->create([
                'onboarding_execution_id' => $locked->id,
                'discovery_snapshot_id' => $snapshot->id,
                'source_operation_id' => $sourceOperation->id,
                'replaced_operation_id' => $replacedOperation->id,
                'adopted_by' => $actor->id,
                'original_discovery_configuration' => $locked->resolved_configuration['discovery_policy'],
                'note' => filled($note) ? trim($note) : null,
                'adopted_at' => now(),
            ]);

            $manual = $locked->conduction === 'manual';
            $locked->update([
                'discovery_snapshot_id' => $snapshot->id,
                'sample_url' => $sampleUrl,
                'sample_url_selection' => [
                    'method' => 'adopted_discovery_snapshot',
                    'discovery_snapshot_id' => $snapshot->id,
                    'source_operation_id' => $sourceOperation->id,
                    'url' => $sampleUrl,
                    'confirmed' => ! $manual,
                    'selected_at' => now()->toIso8601String(),
                ],
                'state' => $manual ? 'awaiting_manual_step' : 'queued',
                'current_step' => $manual ? 'sample_url_confirmation' : 'profile_generation',
                'paused_at' => $manual ? now() : null,
                'attention_code' => null,
                'attention_message' => null,
            ]);

            return $locked->refresh();
        });

        return $execution->conduction === 'automated'
            ? $this->coordinator->reconcile($execution)
            : $execution->load([
                'crawlAgency',
                'creator',
                'discoverySnapshot',
                'discoveryAdoption.actor',
                'operations',
            ]);
    }

    public function candidates(OnboardingExecution $execution): Collection
    {
        $execution->loadMissing('crawlAgency');
        $laterStepStarted = $execution->operations()
            ->where('onboarding_step', '!=', 'discovery')
            ->exists();

        return DiscoverySnapshot::query()
            ->where('crawl_agency_id', $execution->crawl_agency_id)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get()
            ->map(function (DiscoverySnapshot $snapshot) use ($execution, $laterStepStarted): array {
                $sourceOperation = CrawlerOperation::query()->find($snapshot->operation_id);
                $sampleUrl = $this->selectSampleUrl($snapshot, $execution->crawlAgency->root_domain);
                $reason = match (true) {
                    $execution->state !== 'requires_attention' || $execution->current_step !== 'discovery' => 'A execução não está aguardando recuperação da etapa de Discovery.',
                    $laterStepStarted => 'Uma etapa posterior do onboarding já foi iniciada.',
                    $sourceOperation === null
                        || $sourceOperation->crawl_agency_id !== $execution->crawl_agency_id
                        || $sourceOperation->type !== 'discovery' => 'A Operação do Crawler de origem não é um Discovery desta Crawl Agency.',
                    $sourceOperation->state !== 'succeeded' => 'A Operação do Crawler de origem não terminou com sucesso.',
                    $sampleUrl === null => 'O Snapshot não possui URL de Amostra HTTP(S) elegível para esta Crawl Agency.',
                    default => null,
                };

                return [
                    'id' => $snapshot->id,
                    'operation_id' => $snapshot->operation_id,
                    'crawl_agency_id' => $snapshot->crawl_agency_id,
                    'url_count' => $snapshot->url_count,
                    'content_hash' => $snapshot->content_hash,
                    'created_at' => $snapshot->created_at,
                    'adoption' => [
                        'eligible' => $reason === null,
                        'reason' => $reason,
                        'sample_url' => $reason === null ? $sampleUrl : null,
                        'age_warning' => $snapshot->created_at->lt(now()->subDays(30))
                            ? 'Snapshot criado há mais de 30 dias; confirme se as URLs ainda representam o site atual.'
                            : null,
                    ],
                ];
            });
    }

    private function selectSampleUrl(DiscoverySnapshot $snapshot, string $rootDomain): ?string
    {
        foreach ($snapshot->urls()->orderBy('id')->pluck('url') as $url) {
            $parts = parse_url($url);
            $scheme = strtolower((string) ($parts['scheme'] ?? ''));
            $host = strtolower((string) ($parts['host'] ?? ''));
            $path = (string) ($parts['path'] ?? '');
            $normalizedRoot = strtolower($rootDomain);
            $belongsToAgency = $host === $normalizedRoot || str_ends_with($host, ".{$normalizedRoot}");

            if (in_array($scheme, ['http', 'https'], true) && $belongsToAgency && ! in_array($path, ['', '/'], true)) {
                return $url;
            }
        }

        return null;
    }
}
