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
            'market_data_contract_version_id' => $this->market_data_contract_version_id,
            'resolved_configuration' => $this->resolved_configuration,
            'sample_url' => $this->sample_url,
            'sample_url_selection' => $this->sample_url_selection,
            'attention' => $this->attention_code === null ? null : [
                'code' => $this->attention_code,
                'message' => $this->attention_message,
            ],
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
            'next_action' => match ($this->state) {
                'queued' => 'wait_for_coordinator',
                'running' => 'wait_for_current_operation',
                'awaiting_manual_step' => $this->manualNextAction(),
                'requires_attention' => $this->conduction === 'manual'
                    && $this->attention_code === 'child_operation_failed'
                    ? 'retry_failed_operation'
                    : 'review_attention',
                'awaiting_approval' => 'decide_onboarding',
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
            ? ['discovery', 'sample_url_confirmation', 'profile_generation', 'profile_validation', 'approval']
            : ['discovery', 'profile_generation', 'profile_validation', 'approval'];
        $currentIndex = array_search($this->current_step, $keys, true);
        $currentIndex = $currentIndex === false ? 0 : $currentIndex;

        return collect($keys)->map(function (string $key, int $index) use ($currentIndex, $operations): array {
            $operation = $operations
                ->where('onboarding_step', $key)
                ->sortByDesc('attempt')
                ->first();
            $state = match (true) {
                $operation !== null && $operation->state === 'succeeded' => 'completed',
                $operation !== null => $operation->state,
                $key === 'approval' && $this->state === 'awaiting_approval' => 'awaiting_approval',
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
}
