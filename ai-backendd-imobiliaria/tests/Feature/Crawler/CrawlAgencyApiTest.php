<?php

namespace Tests\Feature\Crawler;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CrawlAgencyApiTest extends TestCase
{
    use RefreshDatabase;

    private User $platformAdmin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        $this->platformAdmin = User::query()
            ->where('email', 'platform@imobiliaria.com')
            ->firstOrFail();
    }

    public function test_operator_can_register_and_read_a_crawl_agency(): void
    {
        $created = $this->actingAs($this->platformAdmin)
            ->postJson('/api/v1/admin/crawler/crawl-agencies', [
                'name' => 'Imóveis Litoral',
                'slug' => 'imoveis-litoral',
                'base_url' => 'https://www.imoveislitoral.com.br/imoveis',
                'root_domain' => 'imoveislitoral.com.br',
            ])
            ->assertCreated()
            ->assertJsonPath('data.lifecycle_state', 'onboarding')
            ->assertJsonPath('data.health_state', 'unknown')
            ->json('data');

        $this->actingAs($this->platformAdmin)
            ->getJson('/api/v1/admin/crawler/crawl-agencies/'.$created['id'])
            ->assertOk()
            ->assertJsonPath('data.id', $created['id'])
            ->assertJsonPath('data.root_domain', 'imoveislitoral.com.br');
    }

    public function test_root_domain_is_globally_unique(): void
    {
        $payload = [
            'name' => 'Primeira Agência',
            'slug' => 'primeira-agencia',
            'base_url' => 'https://example.com/imoveis',
            'root_domain' => 'example.com',
        ];

        $this->actingAs($this->platformAdmin)
            ->postJson('/api/v1/admin/crawler/crawl-agencies', $payload)
            ->assertCreated();

        $this->actingAs($this->platformAdmin)
            ->postJson('/api/v1/admin/crawler/crawl-agencies', [
                ...$payload,
                'name' => 'Agência Duplicada',
                'slug' => 'agencia-duplicada',
                'root_domain' => 'EXAMPLE.COM',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('root_domain');
    }

    public function test_lifecycle_rejects_invalid_transitions_and_keeps_health_separate(): void
    {
        $agency = $this->actingAs($this->platformAdmin)
            ->postJson('/api/v1/admin/crawler/crawl-agencies', [
                'name' => 'Agência em Onboarding',
                'slug' => 'agencia-onboarding',
                'base_url' => 'https://onboarding.example.com',
                'root_domain' => 'onboarding.example.com',
            ])
            ->assertCreated()
            ->json('data');

        $this->actingAs($this->platformAdmin)
            ->patchJson('/api/v1/admin/crawler/crawl-agencies/'.$agency['id'].'/lifecycle', [
                'lifecycle_state' => 'paused',
            ])
            ->assertUnprocessable();

        $this->actingAs($this->platformAdmin)
            ->patchJson('/api/v1/admin/crawler/crawl-agencies/'.$agency['id'].'/lifecycle', [
                'lifecycle_state' => 'active',
            ])
            ->assertOk()
            ->assertJsonPath('data.lifecycle_state', 'active')
            ->assertJsonPath('data.health_state', 'unknown');
    }

    public function test_editing_name_and_domain_preserves_internal_identity(): void
    {
        $agency = $this->actingAs($this->platformAdmin)
            ->postJson('/api/v1/admin/crawler/crawl-agencies', [
                'name' => 'Nome Original',
                'slug' => 'nome-original',
                'base_url' => 'https://old.example.com',
                'root_domain' => 'old.example.com',
            ])
            ->assertCreated()
            ->json('data');

        $this->actingAs($this->platformAdmin)
            ->putJson('/api/v1/admin/crawler/crawl-agencies/'.$agency['id'], [
                'name' => 'Nome Atualizado',
                'slug' => 'nome-atualizado',
                'base_url' => 'https://new.example.com/listings',
                'root_domain' => 'new.example.com',
            ])
            ->assertOk()
            ->assertJsonPath('data.id', $agency['id'])
            ->assertJsonPath('data.root_domain', 'new.example.com');
    }

    public function test_list_filters_by_name_domain_lifecycle_and_health(): void
    {
        foreach ([
            ['Alpha Sul', 'alpha-sul', 'alpha.example.com'],
            ['Beta Norte', 'beta-norte', 'beta.example.com'],
        ] as [$name, $slug, $domain]) {
            $this->actingAs($this->platformAdmin)
                ->postJson('/api/v1/admin/crawler/crawl-agencies', [
                    'name' => $name,
                    'slug' => $slug,
                    'base_url' => 'https://'.$domain,
                    'root_domain' => $domain,
                ])
                ->assertCreated();
        }

        $this->actingAs($this->platformAdmin)
            ->getJson('/api/v1/admin/crawler/crawl-agencies?search=beta.example&lifecycle_state=onboarding&health_state=unknown')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Beta Norte');
    }
}
