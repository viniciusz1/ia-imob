<?php

namespace Tests\Feature\Crawler;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OnboardingPolicyCatalogApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        $this->admin = User::query()
            ->where('email', 'platform@imobiliaria.com')
            ->firstOrFail();
    }

    public function test_discovery_policy_lifecycle_preserves_historical_versions(): void
    {
        $versionOne = $this->actingAs($this->admin)
            ->postJson('/api/v1/admin/crawler/discovery-policy-versions', [
                'name' => 'Portais nacionais',
                'strategies' => ['sitemap'],
                'configuration' => ['max_urls' => 500],
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.version', 1)
            ->assertJsonPath('data.mutable', true)
            ->json('data');

        $this->actingAs($this->admin)
            ->putJson("/api/v1/admin/crawler/discovery-policy-versions/{$versionOne['id']}", [
                'strategies' => ['sitemap', 'homepage'],
                'configuration' => ['max_urls' => 800],
            ])
            ->assertOk()
            ->assertJsonPath('data.configuration.max_urls', 800);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/discovery-policy-versions/{$versionOne['id']}/publish")
            ->assertOk()
            ->assertJsonPath('data.status', 'available')
            ->assertJsonPath('data.mutable', false);

        $this->actingAs($this->admin)
            ->putJson("/api/v1/admin/crawler/discovery-policy-versions/{$versionOne['id']}", [
                'strategies' => ['robots'],
                'configuration' => ['max_urls' => 10],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');

        $versionTwo = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/discovery-policy-versions/{$versionOne['id']}/versions")
            ->assertCreated()
            ->assertJsonPath('data.version', 2)
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.policy_key', $versionOne['policy_key'])
            ->assertJsonPath('data.strategies.0', 'sitemap')
            ->assertJsonPath('data.strategies.1', 'homepage')
            ->json('data');

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/discovery-policy-versions/{$versionOne['id']}/versions")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');

        $this->actingAs($this->admin)
            ->putJson("/api/v1/admin/crawler/discovery-policy-versions/{$versionTwo['id']}", [
                'strategies' => ['robots'],
                'configuration' => ['max_urls' => 1200],
            ])
            ->assertOk();

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/discovery-policy-versions/{$versionTwo['id']}/archive")
            ->assertOk()
            ->assertJsonPath('data.status', 'archived');

        $versionThree = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/discovery-policy-versions/{$versionOne['id']}/versions")
            ->assertCreated()
            ->assertJsonPath('data.version', 3)
            ->json('data');
        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/discovery-policy-versions/{$versionThree['id']}/archive")
            ->assertOk();

        $this->actingAs($this->admin)
            ->getJson("/api/v1/admin/crawler/discovery-policy-versions/{$versionOne['id']}")
            ->assertOk()
            ->assertJsonPath('data.strategies.0', 'sitemap')
            ->assertJsonPath('data.strategies.1', 'homepage')
            ->assertJsonPath('data.configuration.max_urls', 800);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/discovery-policy-versions/{$versionOne['id']}/archive")
            ->assertOk()
            ->assertJsonPath('data.status', 'archived');

        $this->actingAs($this->admin)
            ->getJson('/api/v1/admin/crawler/discovery-policy-versions')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_only_registered_safe_discovery_and_canonical_extraction_strategies_are_accepted(): void
    {
        $this->actingAs($this->admin)
            ->getJson('/api/v1/admin/crawler/discovery-strategies')
            ->assertOk()
            ->assertJsonFragment([
                'key' => 'sitemap',
                'kind' => 'native',
                'safety_status' => 'safe',
            ]);

        $blocked = $this->actingAs($this->admin)
            ->postJson('/api/v1/admin/crawler/discovery-strategies', [
                'key' => 'unsafe_partner_feed',
                'label' => 'Feed externo não validado',
                'safety_status' => 'blocked',
            ])
            ->assertCreated()
            ->assertJsonPath('data.kind', 'custom')
            ->json('data');

        $this->actingAs($this->admin)
            ->postJson('/api/v1/admin/crawler/discovery-policy-versions', [
                'name' => 'Política bloqueada',
                'strategies' => [$blocked['key']],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('strategies.0');

        $safe = $this->actingAs($this->admin)
            ->postJson('/api/v1/admin/crawler/discovery-strategies', [
                'key' => 'safe_partner_feed',
                'label' => 'Feed externo validado',
                'safety_status' => 'safe',
            ])
            ->assertCreated()
            ->json('data');

        $this->actingAs($this->admin)
            ->postJson('/api/v1/admin/crawler/discovery-policy-versions', [
                'name' => 'Política customizada',
                'strategies' => [$safe['key']],
            ])
            ->assertCreated();

        $this->actingAs($this->admin)
            ->postJson('/api/v1/admin/crawler/discovery-policy-versions', [
                'name' => 'Política desconhecida',
                'strategies' => ['not_registered'],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('strategies.0');

        $this->actingAs($this->admin)
            ->postJson('/api/v1/admin/crawler/extraction-policy-versions', [
                'name' => 'Sem estratégia',
                'strategies' => [],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('strategies');

        $this->actingAs($this->admin)
            ->postJson('/api/v1/admin/crawler/extraction-policy-versions', [
                'name' => 'Ordem inválida',
                'strategies' => ['css', 'xpath'],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('strategies');

        $this->actingAs($this->admin)
            ->postJson('/api/v1/admin/crawler/extraction-policy-versions', [
                'name' => 'Fallback controlado',
                'strategies' => ['xpath', 'fit_markdown_llm', 'llm_full_html'],
            ])
            ->assertCreated()
            ->assertJsonPath('data.strategies.0', 'xpath')
            ->assertJsonPath('data.strategies.1', 'fit_markdown_llm')
            ->assertJsonPath('data.strategies.2', 'llm_full_html');
    }

    public function test_models_keep_exact_policy_references_and_only_one_available_default(): void
    {
        [$discoveryOne, $extractionOne] = $this->createPublishedPolicies('Primeira');
        [$discoveryTwo, $extractionTwo] = $this->createPublishedPolicies('Segunda');

        $modelOne = $this->createModel(
            'Onboarding econômico',
            $discoveryOne['id'],
            $extractionOne['id'],
        );

        $this->actingAs($this->admin)
            ->putJson("/api/v1/admin/crawler/onboarding-execution-model-versions/{$modelOne['id']}", [
                'discovery_policy_version_id' => $discoveryTwo['id'],
                'extraction_policy_version_id' => $extractionTwo['id'],
            ])
            ->assertOk()
            ->assertJsonPath('data.discovery_policy_version_id', $discoveryTwo['id'])
            ->assertJsonPath('data.extraction_policy_version_id', $extractionTwo['id']);

        $this->publishModel($modelOne['id']);
        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-execution-model-versions/{$modelOne['id']}/default")
            ->assertOk()
            ->assertJsonPath('data.is_default', true);

        $modelTwo = $this->createModel(
            'Onboarding completo',
            $discoveryOne['id'],
            $extractionOne['id'],
        );
        $this->publishModel($modelTwo['id']);
        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-execution-model-versions/{$modelTwo['id']}/default")
            ->assertOk()
            ->assertJsonPath('data.is_default', true);

        $this->actingAs($this->admin)
            ->getJson("/api/v1/admin/crawler/onboarding-execution-model-versions/{$modelOne['id']}")
            ->assertOk()
            ->assertJsonPath('data.is_default', false)
            ->assertJsonPath('data.discovery_policy_version_id', $discoveryTwo['id'])
            ->assertJsonPath('data.extraction_policy_version_id', $extractionTwo['id']);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/discovery-policy-versions/{$discoveryOne['id']}/archive")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-execution-model-versions/{$modelTwo['id']}/archive")
            ->assertOk()
            ->assertJsonPath('data.status', 'archived')
            ->assertJsonPath('data.is_default', false);

        $this->actingAs($this->admin)
            ->getJson("/api/v1/admin/crawler/discovery-policy-versions/{$discoveryOne['id']}")
            ->assertOk()
            ->assertJsonPath('data.model_reference_count', 1)
            ->assertJsonPath('data.active_model_reference_count', 0);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/discovery-policy-versions/{$discoveryOne['id']}/archive")
            ->assertOk()
            ->assertJsonPath('data.status', 'archived');

        $draftTwo = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-execution-model-versions/{$modelOne['id']}/versions")
            ->assertCreated()
            ->assertJsonPath('data.version', 2)
            ->assertJsonPath('data.model_key', $modelOne['model_key'])
            ->assertJsonPath('data.discovery_policy_version_id', $discoveryTwo['id'])
            ->assertJsonPath('data.extraction_policy_version_id', $extractionTwo['id'])
            ->json('data');

        $this->actingAs($this->admin)
            ->getJson("/api/v1/admin/crawler/onboarding-execution-model-versions/{$draftTwo['id']}")
            ->assertOk()
            ->assertJsonPath('data.discovery_policy.name', 'Segunda discovery')
            ->assertJsonPath('data.extraction_policy.name', 'Segunda extraction');
    }

    public function test_duplicate_logical_names_and_draft_policy_references_are_rejected(): void
    {
        $discovery = $this->actingAs($this->admin)
            ->postJson('/api/v1/admin/crawler/discovery-policy-versions', [
                'name' => 'Identidade única',
                'strategies' => ['sitemap'],
            ])
            ->assertCreated()
            ->json('data');
        $extraction = $this->actingAs($this->admin)
            ->postJson('/api/v1/admin/crawler/extraction-policy-versions', [
                'name' => 'Extração em rascunho',
                'strategies' => ['xpath'],
            ])
            ->assertCreated()
            ->json('data');

        $this->actingAs($this->admin)
            ->postJson('/api/v1/admin/crawler/discovery-policy-versions', [
                'name' => 'identidade ÚNICA',
                'strategies' => ['robots'],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');

        $this->actingAs($this->admin)
            ->postJson('/api/v1/admin/crawler/onboarding-execution-model-versions', [
                'name' => 'Referência inválida',
                'discovery_policy_version_id' => $discovery['id'],
                'extraction_policy_version_id' => $extraction['id'],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'discovery_policy_version_id',
                'extraction_policy_version_id',
            ]);
    }

    private function createPublishedPolicies(string $prefix): array
    {
        $discovery = $this->actingAs($this->admin)
            ->postJson('/api/v1/admin/crawler/discovery-policy-versions', [
                'name' => "{$prefix} discovery",
                'strategies' => ['sitemap'],
            ])
            ->assertCreated()
            ->json('data');
        $extraction = $this->actingAs($this->admin)
            ->postJson('/api/v1/admin/crawler/extraction-policy-versions', [
                'name' => "{$prefix} extraction",
                'strategies' => ['xpath', 'css'],
            ])
            ->assertCreated()
            ->json('data');

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/discovery-policy-versions/{$discovery['id']}/publish")
            ->assertOk();
        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/extraction-policy-versions/{$extraction['id']}/publish")
            ->assertOk();

        return [$discovery, $extraction];
    }

    private function createModel(string $name, int $discoveryId, int $extractionId): array
    {
        return $this->actingAs($this->admin)
            ->postJson('/api/v1/admin/crawler/onboarding-execution-model-versions', [
                'name' => $name,
                'discovery_policy_version_id' => $discoveryId,
                'extraction_policy_version_id' => $extractionId,
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->json('data');
    }

    private function publishModel(int $modelId): void
    {
        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-execution-model-versions/{$modelId}/publish")
            ->assertOk()
            ->assertJsonPath('data.status', 'available');
    }
}
