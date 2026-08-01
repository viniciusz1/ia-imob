<?php

namespace App\Http\Resources\Crawler;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;

class OnboardingExecutionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $operations = $this->relationLoaded('operations')
            ? $this->operations
            : collect();
        $recovery = $this->recovery($operations);

        return [
            'id' => $this->id,
            'onboarding_plan_id' => $this->onboarding_plan_id,
            'crawl_agency_id' => $this->crawl_agency_id,
            'name' => $this->name,
            'conduction' => $this->conduction,
            'state' => $this->state,
            'current_step' => $this->current_step,
            'execution_model_version_id' => $this->execution_model_version_id,
            'discovery_policy_version_id' => $this->discovery_policy_version_id,
            'extraction_policy_version_id' => $this->extraction_policy_version_id,
            'discovery_snapshot_id' => $this->discovery_snapshot_id,
            'discovery_adoption' => $this->whenLoaded(
                'discoveryAdoption',
                fn () => $this->discoveryAdoption === null ? null : [
                    'discovery_snapshot_id' => $this->discoveryAdoption->discovery_snapshot_id,
                    'source_operation_id' => $this->discoveryAdoption->source_operation_id,
                    'replaced_operation_id' => $this->discoveryAdoption->replaced_operation_id,
                    'adopted_by' => $this->discoveryAdoption->relationLoaded('actor') ? [
                        'id' => $this->discoveryAdoption->actor->id,
                        'name' => $this->discoveryAdoption->actor->name,
                    ] : null,
                    'original_discovery_configuration' => $this->discoveryAdoption->original_discovery_configuration,
                    'note' => $this->discoveryAdoption->note,
                    'adopted_at' => $this->discoveryAdoption->adopted_at,
                ],
            ),
            'market_data_contract_version_id' => $this->market_data_contract_version_id,
            'extraction_profile_id' => $this->extraction_profile_id,
            'profile_validation_report_id' => $this->profile_validation_report_id,
            'first_production_discovery_mode' => $this->first_production_discovery_mode,
            'first_production_crawl_run_id' => $this->first_production_crawl_run_id,
            'created_by' => $this->whenLoaded('creator', fn () => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ]),
            'resolved_configuration' => $this->resolved_configuration,
            'sample_url' => $this->sample_url,
            'sample_url_selection' => $this->sample_url_selection,
            'attention' => $this->attention_code === null ? null : [
                'code' => $this->attention_code,
                'category' => $recovery['category'],
                'message' => $recovery['message'],
            ],
            'approval' => $this->approved_at === null ? null : [
                'approved_by' => $this->approved_by,
                'approved_at' => $this->approved_at,
                'reason' => $this->approval_reason,
            ],
            'first_production' => $this->whenLoaded(
                'firstProductionCrawlRun',
                fn () => $this->firstProductionCrawlRun === null ? null : [
                    'crawl_run_id' => $this->firstProductionCrawlRun->id,
                    'technical_state' => $this->firstProductionCrawlRun->technical_state,
                    'publication_state' => $this->firstProductionCrawlRun->publication_state,
                    'quality_verdict' => $this->firstProductionCrawlRun->relationLoaded('qualityReport')
                        ? $this->firstProductionCrawlRun->qualityReport?->verdict
                        : null,
                ],
            ),
            'steps' => $this->steps($operations),
            'operations' => $operations->map(fn ($operation): array => [
                'id' => $operation->id,
                'type' => $operation->type,
                'state' => $operation->state,
                'step' => $operation->onboarding_step,
                'attempt' => $operation->attempt,
                'retry_of_operation_id' => $operation->retry_of_operation_id,
                'progress' => [
                    'stage' => $operation->stage,
                    'percentage' => $operation->progress_percentage,
                    'message' => $operation->progress_message,
                ],
                'result' => $operation->result,
                'error' => $operation->error_code === null ? null : [
                    'code' => $operation->error_code,
                    'message' => $operation->error_message,
                ],
                'created_at' => $operation->created_at,
                'completed_at' => $operation->completed_at,
            ])->values(),
            'recovery_actions' => $recovery['actions'],
            'next_action' => match ($this->state) {
                'queued' => 'wait_for_coordinator',
                'running' => 'wait_for_current_operation',
                'awaiting_manual_step' => $this->manualNextAction(),
                'awaiting_approval' => 'decide_onboarding',
                'awaiting_first_production' => 'start_first_production',
                'requires_attention' => data_get($recovery, 'actions.0.key', 'review_attention'),
                default => null,
            },
            'started_at' => $this->started_at,
            'paused_at' => $this->paused_at,
            'completed_at' => $this->completed_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    private function steps(Collection $operations): array
    {
        $keys = $this->conduction === 'manual'
            ? ['discovery', 'sample_url_confirmation', 'profile_generation', 'profile_validation', 'approval', 'first_production', 'quality_gate']
            : ['discovery', 'profile_generation', 'profile_validation', 'approval', 'first_production', 'quality_gate'];
        $currentIndex = array_search($this->current_step, $keys, true);
        $currentIndex = $currentIndex === false ? 0 : $currentIndex;

        return collect($keys)->map(function (string $key, int $index) use ($currentIndex, $operations): array {
            $operation = $operations
                ->where('onboarding_step', $key)
                ->sortByDesc('attempt')
                ->first();
            $state = match (true) {
                $key === 'quality_gate'
                    && $this->firstProductionCrawlRun?->publication_state === 'published' => 'published',
                $key === 'quality_gate'
                    && $this->firstProductionCrawlRun?->publication_state === 'quarantined' => 'quarantined',
                $operation !== null && $operation->state === 'succeeded' => 'completed',
                $operation !== null => $operation->state,
                $key === 'approval' && $this->state === 'awaiting_approval' => 'awaiting_approval',
                $key === 'first_production'
                    && $this->state === 'awaiting_first_production' => 'awaiting_first_production',
                $index < $currentIndex => 'completed',
                $index === $currentIndex && $this->state === 'requires_attention' => 'requires_attention',
                $index === $currentIndex && $this->state === 'queued' => 'queued',
                default => 'pending',
            };

            return [
                'key' => $key,
                'state' => $state,
                'operation_id' => $operation?->id,
                'attempt' => $operation?->attempt,
            ];
        })->all();
    }

    private function manualNextAction(): ?string
    {
        return match ($this->current_step) {
            'discovery' => 'run_discovery',
            'sample_url_confirmation' => $this->attention_code === 'validation_rejected'
                ? 'correct_sample_url'
                : 'confirm_sample_url',
            'profile_generation' => 'run_profile_generation',
            'profile_validation' => 'run_profile_validation',
            default => null,
        };
    }

    private function recovery(Collection $operations): array
    {
        if ($this->state !== 'requires_attention') {
            return [
                'category' => null,
                'message' => $this->attention_message,
                'actions' => [],
            ];
        }

        if ($this->attention_code === 'first_production_failed') {
            return [
                'category' => 'unknown',
                'message' => 'A primeira produção falhou. Consulte os detalhes técnicos antes de tentar novamente.',
                'actions' => [[
                    'key' => 'retry_first_production',
                    'priority' => 'primary',
                    'enabled' => true,
                    'reason' => 'Uma nova tentativa preservará o resultado original.',
                ]],
            ];
        }

        if ($this->attention_code === 'eligible_sample_url_missing') {
            return [
                'category' => 'configuration',
                'message' => 'O Discovery concluído não contém uma URL de imóvel elegível. Use outro Snapshot ou execute um Discovery personalizado.',
                'actions' => $this->discoveryRecoveryActions(),
            ];
        }

        if ($this->attention_code !== 'child_operation_failed') {
            return [
                'category' => 'unknown',
                'message' => $this->attention_message,
                'actions' => [[
                    'key' => 'review_attention',
                    'priority' => 'primary',
                    'enabled' => true,
                    'reason' => 'Revise o diagnóstico técnico antes de continuar.',
                ]],
            ];
        }

        $operation = $operations
            ->where('onboarding_step', $this->current_step)
            ->whereIn('state', ['failed', 'cancelled'])
            ->sortByDesc('attempt')
            ->first();
        $errorCode = strtolower((string) $operation?->error_code);
        $errorMessage = (string) $operation?->error_message;
        $configurationFailure = in_array($errorCode, [
            'invalid_configuration',
            'invalid_discovery_source',
            'invalid_discovery_sources',
        ], true) || str_contains(strtolower($errorMessage), 'invalid source(s)');
        $transientFailure = in_array($errorCode, [
            'connection_error',
            'http_error',
            'lease_expired',
            'network_error',
            'operation_timeout',
            'worker_timeout',
        ], true);

        if ($configurationFailure) {
            return [
                'category' => 'configuration',
                'message' => 'A configuração de Discovery usa uma fonte sem suporte do worker. Revise a configuração antes de tentar novamente.',
                'actions' => array_merge([
                    [
                        'key' => 'review_configuration',
                        'priority' => 'primary',
                        'enabled' => true,
                        'reason' => 'A mesma configuração tende a repetir esta falha.',
                    ],
                    [
                        'key' => 'retry_failed_operation',
                        'priority' => 'secondary',
                        'enabled' => true,
                        'reason' => 'Retente sem alterar as entradas somente depois de corrigir ou atualizar o worker.',
                    ],
                ], $this->discoveryRecoveryActions()),
            ];
        }

        if ($transientFailure) {
            return [
                'category' => 'transient',
                'message' => 'A etapa falhou por um problema transitório e pode ser retentada.',
                'actions' => array_merge([[
                    'key' => 'retry_failed_operation',
                    'priority' => 'primary',
                    'enabled' => true,
                    'reason' => 'A nova tentativa preservará as mesmas entradas.',
                ]], $this->discoveryRecoveryActions()),
            ];
        }

        return [
            'category' => 'unknown',
            'message' => 'A etapa falhou. Consulte os detalhes técnicos antes de tentar novamente.',
            'actions' => array_merge([[
                'key' => 'retry_failed_operation',
                'priority' => 'primary',
                'enabled' => true,
                'reason' => 'A retentativa preserva as entradas e a tentativa original.',
            ]], $this->discoveryRecoveryActions()),
        ];
    }

    private function discoveryRecoveryActions(): array
    {
        if ($this->current_step !== 'discovery') {
            return [];
        }

        return [
            [
                'key' => 'use_existing_discovery_snapshot',
                'priority' => 'secondary',
                'enabled' => true,
                'reason' => 'Adote o resultado de um Discovery independente concluído com sucesso.',
            ],
            [
                'key' => 'create_custom_discovery',
                'priority' => 'secondary',
                'enabled' => true,
                'reason' => 'Execute um Discovery personalizado e use o Snapshot resultante para continuar.',
            ],
        ];
    }
}
