<?php

namespace Tests\Feature;

use App\Models\PropertyValuation;
use App\Models\ScrapyProperty;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;
use ZipArchive;

class ValuationApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->app[PermissionRegistrar::class]->forgetCachedPermissions();
        Permission::firstOrCreate(['name' => 'valuations.create', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'valuations.view', 'guard_name' => 'web']);
    }

    public function test_user_with_permission_can_create_saved_valuation_with_insufficient_sample(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->for($tenant)->create();
        $user->givePermissionTo('valuations.create');

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/valuations', [
            'city' => ['Jaraguá do Sul'],
            'neighborhood' => ['Centro'],
            'residential_type' => 'house',
            'area' => 120,
            'bedrooms' => 3,
            'bathrooms' => 2,
            'garage_spaces' => 2,
            'flood_risk' => false,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', PropertyValuation::STATUS_INSUFFICIENT_SAMPLE)
            ->assertJsonPath('data.status_label', 'Amostra insuficiente')
            ->assertJsonPath('data.subject_property.city', 'Jaraguá do Sul')
            ->assertJsonPath('data.subject_property.neighborhood', 'Centro')
            ->assertJsonPath('data.can_download_report', false);

        $this->assertDatabaseHas('property_valuations', [
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'status' => PropertyValuation::STATUS_INSUFFICIENT_SAMPLE,
            'residential_type' => 'house',
        ]);

        $valuation = PropertyValuation::withoutGlobalScopes()->firstOrFail();
        $this->assertSame(['Jaraguá do Sul'], $valuation->city);
        $this->assertSame(['Centro'], $valuation->neighborhood);
        $this->assertStringStartsWith('AVL-'.now()->format('Y').'-', $valuation->code);
    }

    public function test_user_without_create_permission_cannot_create_valuation(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->for($tenant)->create();

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/valuations', [
            'city' => ['Jaraguá do Sul'],
            'neighborhood' => ['Centro'],
            'residential_type' => 'house',
            'area' => 120,
            'bedrooms' => 3,
            'bathrooms' => 2,
            'garage_spaces' => 2,
            'flood_risk' => false,
        ]);

        $response->assertForbidden();
        $this->assertDatabaseCount('property_valuations', 0);
    }

    public function test_user_can_preview_up_to_fifty_pending_comparable_candidates(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->for($tenant)->create();
        $user->givePermissionTo('valuations.create');

        foreach (range(1, 55) as $index) {
            $this->createComparable([
                'area' => 80 + $index,
                'valor' => (80 + $index) * 6000,
                'link_imovel' => "https://example.com/imovel/{$index}",
            ]);
        }

        $this->createComparable([
            'bairro' => 'outro bairro',
            'valor' => 999999,
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/valuations/candidates', $this->valuationPayload(['area' => 100]));

        $response->assertOk()
            ->assertJsonCount(50, 'data')
            ->assertJsonPath('data.0.review_status', 'pending')
            ->assertJsonPath('data.0.link', 'https://example.com/imovel/20');

        $this->assertDatabaseCount('property_valuations', 0);
    }

    public function test_candidate_preview_merges_exact_and_relaxed_bathroom_matches(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->for($tenant)->create();
        $user->givePermissionTo('valuations.create');

        foreach ([5000, 5500] as $pricePerSquareMeter) {
            $this->createComparable(['banheiros' => 2, 'valor' => $pricePerSquareMeter * 100]);
        }

        foreach ([6000, 6500, 7000] as $pricePerSquareMeter) {
            $this->createComparable(['banheiros' => 3, 'valor' => $pricePerSquareMeter * 100]);
        }

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/valuations/candidates', $this->valuationPayload());

        $response->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('data.0.review_status', 'pending');

        $this->assertDatabaseCount('property_valuations', 0);
    }

    public function test_candidate_preview_handles_only_relaxed_bathroom_matches(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->for($tenant)->create();
        $user->givePermissionTo('valuations.create');

        foreach ([6000, 6500, 7000] as $pricePerSquareMeter) {
            $this->createComparable(['banheiros' => 3, 'valor' => $pricePerSquareMeter * 100]);
        }

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/valuations/candidates', $this->valuationPayload());

        $response->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.0.review_status', 'pending');

        $this->assertDatabaseCount('property_valuations', 0);
    }

    public function test_reviewed_valuation_uses_only_approved_comparables_and_preserves_rejected_evidence(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->for($tenant)->create();
        $user->givePermissionTo('valuations.create');

        $low = $this->createComparable(['valor' => 5000 * 100]);
        $middle = $this->createComparable(['valor' => 6000 * 100]);
        $high = $this->createComparable(['valor' => 7000 * 100]);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/valuations', $this->valuationPayload([
            'comparable_reviews' => [
                ['scrapy_property_id' => $low->id, 'status' => 'approved'],
                ['scrapy_property_id' => $middle->id, 'status' => 'rejected'],
                ['scrapy_property_id' => $high->id, 'status' => 'approved'],
            ],
        ]));

        $response->assertCreated()
            ->assertJsonPath('data.status', PropertyValuation::STATUS_CALCULATED)
            ->assertJsonPath('data.sample_summary.used_count', 2)
            ->assertJsonPath('data.sample_summary.rejected_count', 1)
            ->assertJsonPath('data.base_range.central', 720000)
            ->assertJsonPath('data.calculation_summary', 'A avaliação usa 2 imóveis comparáveis no mesmo bairro e cidade. A faixa de mercado usa p25, mediana e p75 do valor por metro quadrado. Foi rejeitado 1 candidato comparável na revisão manual.')
            ->assertJsonCount(3, 'data.comparable_evidence');

        $evidence = collect($response->json('data.comparable_evidence'));

        $this->assertSame(
            [$low->id, $high->id],
            $evidence->where('review_status', 'approved')->pluck('scrapy_property_id')->values()->all()
        );
        $this->assertSame(
            [$middle->id],
            $evidence->where('review_status', 'rejected')->pluck('scrapy_property_id')->values()->all()
        );
    }

    public function test_reviewed_valuation_requires_every_candidate_to_be_reviewed(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->for($tenant)->create();
        $user->givePermissionTo('valuations.create');

        $first = $this->createComparable(['valor' => 5000 * 100]);
        $this->createComparable(['valor' => 6000 * 100]);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/valuations', $this->valuationPayload([
            'comparable_reviews' => [
                ['scrapy_property_id' => $first->id, 'status' => 'approved'],
            ],
        ]));

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('comparable_reviews');

        $this->assertDatabaseCount('property_valuations', 0);
    }

    public function test_reviewed_valuation_requires_at_least_one_approved_comparable(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->for($tenant)->create();
        $user->givePermissionTo('valuations.create');

        $first = $this->createComparable(['valor' => 5000 * 100]);
        $second = $this->createComparable(['valor' => 6000 * 100]);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/valuations', $this->valuationPayload([
            'comparable_reviews' => [
                ['scrapy_property_id' => $first->id, 'status' => 'rejected'],
                ['scrapy_property_id' => $second->id, 'status' => 'rejected'],
            ],
        ]));

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('comparable_reviews');

        $this->assertDatabaseCount('property_valuations', 0);
    }

    public function test_create_valuation_calculates_market_range_from_strict_comparables(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->for($tenant)->create();
        $user->givePermissionTo('valuations.create');

        foreach ([5000, 5500, 6000, 6500, 7000] as $pricePerSquareMeter) {
            ScrapyProperty::factory()->create([
                'tipo' => 'Casa',
                'cidade' => 'jaragua do sul',
                'bairro' => 'centro',
                'quartos' => 3,
                'banheiros' => 2,
                'vagas' => 2,
                'area' => 100,
                'valor' => $pricePerSquareMeter * 100,
            ]);
        }

        ScrapyProperty::factory()->create([
            'tipo' => 'Casa',
            'cidade' => 'jaragua do sul',
            'bairro' => 'centro norte',
            'quartos' => 3,
            'banheiros' => 2,
            'vagas' => 2,
            'area' => 100,
            'valor' => 999999,
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/valuations', [
            'city' => ['Jaraguá do Sul'],
            'neighborhood' => ['Centro'],
            'residential_type' => 'house',
            'area' => 120,
            'bedrooms' => 3,
            'bathrooms' => 2,
            'garage_spaces' => 2,
            'flood_risk' => false,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', PropertyValuation::STATUS_CALCULATED)
            ->assertJsonPath('data.sample_summary.used_count', 5)
            ->assertJsonPath('data.base_range.min', 660000)
            ->assertJsonPath('data.base_range.central', 720000)
            ->assertJsonPath('data.base_range.max', 780000)
            ->assertJsonPath('data.final_range.central', 720000)
            ->assertJsonCount(5, 'data.comparable_evidence');
    }

    public function test_flood_risk_reduces_full_market_range_and_report_can_be_downloaded(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->for($tenant)->create();
        $user->givePermissionTo(['valuations.create', 'valuations.view']);

        foreach ([5000, 5500, 6000, 6500, 7000] as $pricePerSquareMeter) {
            ScrapyProperty::factory()->create([
                'tipo' => 'Casa',
                'cidade' => 'jaragua do sul',
                'bairro' => 'centro',
                'quartos' => 3,
                'banheiros' => 2,
                'vagas' => 2,
                'area' => 100,
                'valor' => $pricePerSquareMeter * 100,
            ]);
        }

        Sanctum::actingAs($user);

        $createResponse = $this->postJson('/api/v1/valuations', [
            'city' => ['Jaraguá do Sul'],
            'neighborhood' => ['Centro'],
            'residential_type' => 'house',
            'area' => 120,
            'bedrooms' => 3,
            'bathrooms' => 2,
            'garage_spaces' => 2,
            'flood_risk' => true,
        ]);

        $createResponse->assertCreated()
            ->assertJsonPath('data.base_range.central', 720000)
            ->assertJsonPath('data.final_range.min', 462000)
            ->assertJsonPath('data.final_range.central', 504000)
            ->assertJsonPath('data.final_range.max', 546000)
            ->assertJsonPath('data.flood_adjustment_percent', 30)
            ->assertJsonPath('data.can_download_report', true);

        $valuationId = $createResponse->json('data.id');
        $reportResponse = $this->get("/api/v1/valuations/{$valuationId}/report.pdf");

        $reportResponse->assertOk()
            ->assertHeader('content-type', 'application/pdf');
        $this->assertStringStartsWith('%PDF-', $reportResponse->content());
    }

    public function test_pdf_report_uses_valuation_template_with_agency_branding(): void
    {
        $tenant = Tenant::factory()->create(['name' => 'Imobiliária Modelo']);
        $user = User::factory()->for($tenant)->create(['name' => 'Corretor Modelo']);
        $user->givePermissionTo('valuations.view');

        $valuation = PropertyValuation::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'code' => 'AVL-2026-000009',
            'status' => PropertyValuation::STATUS_CALCULATED,
            'city' => ['Jaraguá do Sul'],
            'neighborhood' => ['Centro'],
            'residential_type' => 'house',
            'area' => 120,
            'bedrooms' => 3,
            'bathrooms' => 2,
            'garage_spaces' => 2,
            'flood_risk' => false,
            'base_min_value' => 660000,
            'base_central_value' => 720000,
            'base_max_value' => 780000,
            'final_min_value' => 660000,
            'final_central_value' => 720000,
            'final_max_value' => 780000,
            'sample_summary' => ['total_found' => 5, 'invalid_count' => 0, 'outlier_count' => 0, 'used_count' => 5],
            'comparable_evidence' => [[
                'scrapy_property_id' => 10,
                'residential_type' => 'house',
                'raw_type' => 'Casa',
                'city' => 'Jaraguá do Sul',
                'neighborhood' => 'Centro',
                'bedrooms' => 3,
                'bathrooms' => 2,
                'garage_spaces' => 2,
                'area' => 100,
                'price' => 600000,
                'price_per_square_meter' => 6000,
                'agency' => 'Imobiliária Comparável',
                'link' => 'https://example.com/imovel',
                'review_status' => 'approved',
            ], [
                'scrapy_property_id' => 11,
                'residential_type' => 'house',
                'raw_type' => 'Casa',
                'city' => 'Jaraguá do Sul',
                'neighborhood' => 'Centro',
                'bedrooms' => 3,
                'bathrooms' => 2,
                'garage_spaces' => 2,
                'area' => 120,
                'price' => 840000,
                'price_per_square_meter' => 7000,
                'agency' => 'Imobiliária Rejeitada',
                'link' => 'https://example.com/rejeitado',
                'review_status' => 'rejected',
            ]],
        ]);

        Sanctum::actingAs($user);

        $response = $this->get("/api/v1/valuations/{$valuation->id}/report.pdf");

        $response->assertOk()
            ->assertHeader('content-type', 'application/pdf');
        $this->assertStringStartsWith('%PDF-', $response->content());
        $this->assertStringContainsString('Imobiliaria Modelo', $response->content());
        $this->assertStringContainsString('RESUMO EXECUTIVO', $response->content());
        $this->assertStringContainsString('AMOSTRAS COMPARATIVAS', $response->content());
        $this->assertStringContainsString('Status', $response->content());
        $this->assertStringContainsString('Valido', $response->content());
        $this->assertStringContainsString('Invalido', $response->content());
    }

    public function test_calculated_valuation_report_can_be_downloaded_as_word_with_agency_branding(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('logos/modelo.png', base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/axqWVQAAAAASUVORK5CYII='
        ));

        $tenant = Tenant::factory()->create(['name' => 'Imobiliária Modelo']);
        $tenant->siteSettings()->create(['logo_path' => 'logos/modelo.png']);
        $user = User::factory()->for($tenant)->create(['name' => 'Corretor Modelo']);
        $user->givePermissionTo('valuations.view');

        $valuation = PropertyValuation::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'code' => 'AVL-2026-000010',
            'status' => PropertyValuation::STATUS_CALCULATED,
            'city' => ['Jaraguá do Sul'],
            'neighborhood' => ['Centro'],
            'residential_type' => 'house',
            'area' => 120,
            'bedrooms' => 3,
            'bathrooms' => 2,
            'garage_spaces' => 2,
            'flood_risk' => false,
            'base_min_value' => 660000,
            'base_central_value' => 720000,
            'base_max_value' => 780000,
            'final_min_value' => 660000,
            'final_central_value' => 720000,
            'final_max_value' => 780000,
            'sample_summary' => ['total_found' => 5, 'invalid_count' => 0, 'outlier_count' => 0, 'used_count' => 5],
            'comparable_evidence' => [[
                'scrapy_property_id' => 10,
                'residential_type' => 'house',
                'raw_type' => 'Casa',
                'city' => 'Jaraguá do Sul',
                'neighborhood' => 'Centro',
                'bedrooms' => 3,
                'bathrooms' => 2,
                'garage_spaces' => 2,
                'area' => 100,
                'price' => 600000,
                'price_per_square_meter' => 6000,
                'agency' => 'Imobiliária Comparável',
                'link' => 'https://example.com/imovel',
                'review_status' => 'approved',
            ], [
                'scrapy_property_id' => 11,
                'residential_type' => 'house',
                'raw_type' => 'Casa',
                'city' => 'Jaraguá do Sul',
                'neighborhood' => 'Centro',
                'bedrooms' => 3,
                'bathrooms' => 2,
                'garage_spaces' => 2,
                'area' => 120,
                'price' => 840000,
                'price_per_square_meter' => 7000,
                'agency' => 'Imobiliária Rejeitada',
                'link' => 'https://example.com/rejeitado',
                'review_status' => 'rejected',
            ]],
        ]);

        Sanctum::actingAs($user);

        $response = $this->get("/api/v1/valuations/{$valuation->id}/report.docx");

        $response->assertOk()
            ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
            ->assertHeader('content-disposition', 'attachment; filename="AVL-2026-000010.docx"');

        $docx = $this->openOfficeZip($response->content());

        $this->assertStringContainsString('Imobiliária Modelo', $docx->getFromName('word/header1.xml'));
        $this->assertStringContainsString('RELATÓRIO DE AVALIAÇÃO DE MERCADO', $docx->getFromName('word/document.xml'));
        $this->assertStringContainsString('Status', $docx->getFromName('word/document.xml'));
        $this->assertStringContainsString('Válido', $docx->getFromName('word/document.xml'));
        $this->assertStringContainsString('Inválido', $docx->getFromName('word/document.xml'));
        $this->assertNotFalse($docx->locateName('word/media/logo.png'));

        $docx->close();
    }

    public function test_calculated_valuation_comparables_can_be_downloaded_as_excel(): void
    {
        $tenant = Tenant::factory()->create(['name' => 'Imobiliária Modelo']);
        $user = User::factory()->for($tenant)->create(['name' => 'Corretor Modelo']);
        $user->givePermissionTo('valuations.view');

        $valuation = PropertyValuation::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'code' => 'AVL-2026-000011',
            'status' => PropertyValuation::STATUS_CALCULATED,
            'city' => ['Jaraguá do Sul'],
            'neighborhood' => ['Centro'],
            'residential_type' => 'house',
            'area' => 120,
            'bedrooms' => 3,
            'bathrooms' => 2,
            'garage_spaces' => 2,
            'flood_risk' => false,
            'base_min_value' => 660000,
            'base_central_value' => 720000,
            'base_max_value' => 780000,
            'final_min_value' => 660000,
            'final_central_value' => 720000,
            'final_max_value' => 780000,
            'sample_summary' => ['total_found' => 5, 'invalid_count' => 0, 'outlier_count' => 0, 'used_count' => 5],
            'comparable_evidence' => [[
                'scrapy_property_id' => 10,
                'residential_type' => 'house',
                'raw_type' => 'Casa',
                'city' => 'Jaraguá do Sul',
                'neighborhood' => 'Centro',
                'bedrooms' => 3,
                'bathrooms' => 2,
                'garage_spaces' => 2,
                'area' => 100,
                'price' => 600000,
                'price_per_square_meter' => 6000,
                'agency' => 'Imobiliária Comparável',
                'link' => 'https://example.com/imovel',
                'review_status' => 'approved',
            ], [
                'scrapy_property_id' => 11,
                'residential_type' => 'house',
                'raw_type' => 'Casa',
                'city' => 'Jaraguá do Sul',
                'neighborhood' => 'Centro',
                'bedrooms' => 3,
                'bathrooms' => 2,
                'garage_spaces' => 2,
                'area' => 120,
                'price' => 840000,
                'price_per_square_meter' => 7000,
                'agency' => 'Imobiliária Rejeitada',
                'link' => 'https://example.com/rejeitado',
                'review_status' => 'rejected',
            ]],
        ]);

        Sanctum::actingAs($user);

        $response = $this->get("/api/v1/valuations/{$valuation->id}/comparables.xlsx");

        $response->assertOk()
            ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            ->assertHeader('content-disposition', 'attachment; filename="AVL-2026-000011-comparaveis.xlsx"');

        $xlsx = $this->openOfficeZip($response->content());

        $this->assertStringContainsString('Imóveis comparáveis', $xlsx->getFromName('xl/sharedStrings.xml'));
        $this->assertStringContainsString('Status', $xlsx->getFromName('xl/sharedStrings.xml'));
        $this->assertStringContainsString('Válido', $xlsx->getFromName('xl/sharedStrings.xml'));
        $this->assertStringContainsString('Inválido', $xlsx->getFromName('xl/sharedStrings.xml'));
        $this->assertStringContainsString('Imobiliária Comparável', $xlsx->getFromName('xl/sharedStrings.xml'));
        $this->assertStringContainsString('Imobiliária Rejeitada', $xlsx->getFromName('xl/sharedStrings.xml'));
        $this->assertStringContainsString('Centro', $xlsx->getFromName('xl/sharedStrings.xml'));
        $this->assertStringContainsString('600000', $xlsx->getFromName('xl/worksheets/sheet1.xml'));

        $xlsx->close();
    }

    public function test_view_permission_lists_only_current_tenant_valuations(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $userA = User::factory()->for($tenantA)->create();
        $userA->givePermissionTo('valuations.view');

        PropertyValuation::withoutGlobalScopes()->create([
            'tenant_id' => $tenantA->id,
            'user_id' => $userA->id,
            'code' => 'AVL-2026-000001',
            'status' => PropertyValuation::STATUS_INSUFFICIENT_SAMPLE,
            'city' => ['Jaraguá do Sul'],
            'neighborhood' => ['Centro'],
            'residential_type' => 'house',
            'area' => 100,
            'bedrooms' => 3,
            'bathrooms' => 2,
            'garage_spaces' => 2,
            'flood_risk' => false,
            'sample_summary' => ['total_found' => 0, 'minimum_required' => 5],
            'comparable_evidence' => [],
        ]);

        PropertyValuation::withoutGlobalScopes()->create([
            'tenant_id' => $tenantB->id,
            'user_id' => User::factory()->for($tenantB)->create()->id,
            'code' => 'AVL-2026-000002',
            'status' => PropertyValuation::STATUS_INSUFFICIENT_SAMPLE,
            'city' => ['Jaraguá do Sul'],
            'neighborhood' => ['Centro'],
            'residential_type' => 'house',
            'area' => 100,
            'bedrooms' => 3,
            'bathrooms' => 2,
            'garage_spaces' => 2,
            'flood_risk' => false,
            'sample_summary' => ['total_found' => 0, 'minimum_required' => 5],
            'comparable_evidence' => [],
        ]);

        Sanctum::actingAs($userA);

        $response = $this->getJson('/api/v1/valuations');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.code', 'AVL-2026-000001');
    }

    public function test_user_cannot_view_or_download_report_for_another_tenant_valuation(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $userA = User::factory()->for($tenantA)->create();
        $userA->givePermissionTo('valuations.view');

        $valuation = PropertyValuation::withoutGlobalScopes()->create([
            'tenant_id' => $tenantB->id,
            'user_id' => User::factory()->for($tenantB)->create()->id,
            'code' => 'AVL-2026-000005',
            'status' => PropertyValuation::STATUS_CALCULATED,
            'city' => ['Jaraguá do Sul'],
            'neighborhood' => ['Centro'],
            'residential_type' => 'house',
            'area' => 100,
            'bedrooms' => 3,
            'bathrooms' => 2,
            'garage_spaces' => 2,
            'flood_risk' => false,
            'final_min_value' => 500000,
            'final_central_value' => 600000,
            'final_max_value' => 700000,
            'sample_summary' => ['used_count' => 5],
            'comparable_evidence' => [],
        ]);

        Sanctum::actingAs($userA);

        $this->getJson("/api/v1/valuations/{$valuation->id}")->assertNotFound();
        $this->get("/api/v1/valuations/{$valuation->id}/report.pdf")->assertNotFound();
        $this->get("/api/v1/valuations/{$valuation->id}/report.docx")->assertNotFound();
        $this->get("/api/v1/valuations/{$valuation->id}/comparables.xlsx")->assertNotFound();
    }

    public function test_saved_valuations_do_not_expose_update_or_delete_routes(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->for($tenant)->create();
        $user->givePermissionTo('valuations.view');

        $valuation = PropertyValuation::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'code' => 'AVL-2026-000006',
            'status' => PropertyValuation::STATUS_INSUFFICIENT_SAMPLE,
            'city' => ['Jaraguá do Sul'],
            'neighborhood' => ['Centro'],
            'residential_type' => 'house',
            'area' => 100,
            'bedrooms' => 3,
            'bathrooms' => 2,
            'garage_spaces' => 2,
            'flood_risk' => false,
            'sample_summary' => ['total_found' => 0, 'minimum_required' => 5],
            'comparable_evidence' => [],
        ]);

        Sanctum::actingAs($user);

        $this->putJson("/api/v1/valuations/{$valuation->id}", ['city' => 'Outra cidade'])->assertMethodNotAllowed();
        $this->deleteJson("/api/v1/valuations/{$valuation->id}")->assertMethodNotAllowed();
    }

    public function test_bathrooms_relax_to_plus_or_minus_one_when_exact_sample_is_insufficient(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->for($tenant)->create();
        $user->givePermissionTo('valuations.create');

        foreach ([5000, 5500] as $pricePerSquareMeter) {
            $this->createComparable(['banheiros' => 2, 'valor' => $pricePerSquareMeter * 100]);
        }

        foreach ([6000, 6500, 7000] as $pricePerSquareMeter) {
            $this->createComparable(['banheiros' => 3, 'valor' => $pricePerSquareMeter * 100]);
        }

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/valuations', $this->valuationPayload());

        $response->assertCreated()
            ->assertJsonPath('data.status', PropertyValuation::STATUS_CALCULATED)
            ->assertJsonPath('data.sample_summary.bathrooms_relaxed', true)
            ->assertJsonPath('data.sample_summary.used_count', 5)
            ->assertJsonPath('data.final_range.central', 720000);
    }

    public function test_relaxed_bathroom_sample_still_returns_insufficient_sample_when_below_minimum(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->for($tenant)->create();
        $user->givePermissionTo('valuations.create');

        foreach ([5000, 5500, 6000, 6500] as $pricePerSquareMeter) {
            $this->createComparable(['banheiros' => 3, 'valor' => $pricePerSquareMeter * 100]);
        }

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/valuations', $this->valuationPayload());

        $response->assertCreated()
            ->assertJsonPath('data.status', PropertyValuation::STATUS_INSUFFICIENT_SAMPLE)
            ->assertJsonPath('data.sample_summary.bathrooms_relaxed', true)
            ->assertJsonPath('data.sample_summary.used_count', 0)
            ->assertJsonPath('data.can_download_report', false);
    }

    public function test_final_sample_is_capped_to_thirty_closest_areas(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->for($tenant)->create();
        $user->givePermissionTo('valuations.create');

        foreach (range(1, 35) as $index) {
            $this->createComparable([
                'area' => 100 + $index,
                'valor' => (100 + $index) * 6000,
            ]);
        }

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/valuations', $this->valuationPayload(['area' => 100]));

        $response->assertCreated()
            ->assertJsonPath('data.status', PropertyValuation::STATUS_CALCULATED)
            ->assertJsonPath('data.sample_summary.total_found', 35);

        $areas = array_column($response->json('data.comparable_evidence'), 'area');
        $this->assertLessThanOrEqual(30, count($areas));
        $this->assertGreaterThanOrEqual(101.0, min($areas));
        $this->assertLessThanOrEqual(130.0, max($areas));
    }

    public function test_outlier_trimming_removes_extremes_when_enough_comparables_remain(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->for($tenant)->create();
        $user->givePermissionTo('valuations.create');

        foreach ([1000, 5000, 5200, 5400, 5600, 5800, 6000, 6200, 6400, 6600, 6800, 20000] as $pricePerSquareMeter) {
            $this->createComparable(['valor' => $pricePerSquareMeter * 100]);
        }

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/valuations', $this->valuationPayload());

        $response->assertCreated()
            ->assertJsonPath('data.status', PropertyValuation::STATUS_CALCULATED)
            ->assertJsonPath('data.sample_summary.outlier_count', 2)
            ->assertJsonPath('data.sample_summary.used_count', 10);

        $pricesPerSquareMeter = array_column($response->json('data.comparable_evidence'), 'price_per_square_meter');
        $this->assertNotContains(1000, $pricesPerSquareMeter);
        $this->assertNotContains(20000, $pricesPerSquareMeter);
    }

    public function test_outlier_trimming_is_skipped_when_it_would_drop_below_minimum_sample(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->for($tenant)->create();
        $user->givePermissionTo('valuations.create');

        foreach ([1000, 5000, 5500, 6000, 6500, 20000] as $pricePerSquareMeter) {
            $this->createComparable(['valor' => $pricePerSquareMeter * 100]);
        }

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/valuations', $this->valuationPayload());

        $response->assertCreated()
            ->assertJsonPath('data.status', PropertyValuation::STATUS_CALCULATED)
            ->assertJsonPath('data.sample_summary.outlier_count', 0)
            ->assertJsonPath('data.sample_summary.used_count', 6);
    }

    public function test_invalid_comparables_are_reported_and_excluded_from_calculation(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->for($tenant)->create();
        $user->givePermissionTo('valuations.create');

        foreach ([5000, 5500, 6000, 6500, 7000] as $pricePerSquareMeter) {
            $this->createComparable(['valor' => $pricePerSquareMeter * 100]);
        }

        $this->createComparable(['area' => 0, 'valor' => 600000]);
        $this->createComparable(['area' => 9991000, 'valor' => 600000]);
        $this->createComparable(['area' => 100, 'valor' => 0]);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/valuations', $this->valuationPayload());

        $response->assertCreated()
            ->assertJsonPath('data.status', PropertyValuation::STATUS_CALCULATED)
            ->assertJsonPath('data.sample_summary.total_found', 8)
            ->assertJsonPath('data.sample_summary.invalid_count', 3)
            ->assertJsonPath('data.sample_summary.used_count', 5)
            ->assertJsonCount(5, 'data.comparable_evidence');
    }

    public function test_user_without_view_permission_cannot_list_or_view_valuation_or_download_report(): void
    {
        $tenant = Tenant::factory()->create();
        $creator = User::factory()->for($tenant)->create();
        $viewer = User::factory()->for($tenant)->create();

        $valuation = PropertyValuation::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'user_id' => $creator->id,
            'code' => 'AVL-2026-000003',
            'status' => PropertyValuation::STATUS_CALCULATED,
            'city' => ['Jaraguá do Sul'],
            'neighborhood' => ['Centro'],
            'residential_type' => 'house',
            'area' => 100,
            'bedrooms' => 3,
            'bathrooms' => 2,
            'garage_spaces' => 2,
            'flood_risk' => false,
            'final_min_value' => 500000,
            'final_central_value' => 600000,
            'final_max_value' => 700000,
            'sample_summary' => ['used_count' => 5],
            'comparable_evidence' => [],
        ]);

        Sanctum::actingAs($viewer);

        $this->getJson('/api/v1/valuations')->assertForbidden();
        $this->getJson("/api/v1/valuations/{$valuation->id}")->assertForbidden();
        $this->get("/api/v1/valuations/{$valuation->id}/report.pdf")->assertForbidden();
        $this->get("/api/v1/valuations/{$valuation->id}/report.docx")->assertForbidden();
        $this->get("/api/v1/valuations/{$valuation->id}/comparables.xlsx")->assertForbidden();
    }

    public function test_insufficient_sample_valuation_does_not_have_pdf_report(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->for($tenant)->create();
        $user->givePermissionTo('valuations.view');

        $valuation = PropertyValuation::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'code' => 'AVL-2026-000004',
            'status' => PropertyValuation::STATUS_INSUFFICIENT_SAMPLE,
            'city' => ['Jaraguá do Sul'],
            'neighborhood' => ['Centro'],
            'residential_type' => 'house',
            'area' => 100,
            'bedrooms' => 3,
            'bathrooms' => 2,
            'garage_spaces' => 2,
            'flood_risk' => false,
            'sample_summary' => ['total_found' => 0, 'minimum_required' => 5],
            'comparable_evidence' => [],
        ]);

        Sanctum::actingAs($user);

        $this->get("/api/v1/valuations/{$valuation->id}/report.pdf")->assertNotFound();
        $this->get("/api/v1/valuations/{$valuation->id}/report.docx")->assertNotFound();
        $this->get("/api/v1/valuations/{$valuation->id}/comparables.xlsx")->assertNotFound();
    }

    private function valuationPayload(array $overrides = []): array
    {
        return array_merge([
            'city' => ['Jaraguá do Sul'],
            'neighborhood' => ['Centro'],
            'residential_type' => 'house',
            'area' => 120,
            'bedrooms' => 3,
            'bathrooms' => 2,
            'garage_spaces' => 2,
            'flood_risk' => false,
        ], $overrides);
    }

    private function createComparable(array $overrides = []): ScrapyProperty
    {
        return ScrapyProperty::factory()->create(array_merge([
            'tipo' => 'Casa',
            'cidade' => 'jaragua do sul',
            'bairro' => 'centro',
            'quartos' => 3,
            'banheiros' => 2,
            'vagas' => 2,
            'area' => 100,
            'valor' => 600000,
        ], $overrides));
    }

    private function openOfficeZip(string $contents): ZipArchive
    {
        $path = tempnam(sys_get_temp_dir(), 'valuation-report-');
        file_put_contents($path, $contents);

        $zip = new ZipArchive;
        $this->assertTrue($zip->open($path));

        return $zip;
    }
}
