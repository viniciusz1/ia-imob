<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AgencyConfigResource;
use App\Http\Resources\AgencyFieldExtractorResource;
use App\Models\AgencyFieldExtractor;
use App\Models\SitemapAgency;
use App\Models\WsmAgency;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AgencyConfigController extends Controller
{
    private const AGENCY_TYPES = ['sitemap', 'wsm'];

    private const FIELD_NAMES = [
        'tipo', 'valor', 'bairro', 'cidade', 'link_imovel', 'imagem', 'descricao',
        'quartos', 'suites', 'banheiros', 'vagas', 'area',
        'aceita_permuta', 'financiamento', 'piscina', 'churrasqueira', 'academia',
        'salao_festas', 'playground', 'sacada', 'mobiliado', 'ar_condicionado',
        'lavanderia', 'escritorio', 'closet', 'elevador', 'portaria_24h',
        'andar', 'posicao_solar', 'ano_construcao',
    ];

    public function index(Request $request): JsonResponse
    {
        $this->authorizeView($request);

        return response()->json([
            'data' => [
                'sitemap_agencies' => AgencyConfigResource::collection(
                    SitemapAgency::with('extractors')->orderBy('name')->get()
                )->resolve($request),
                'wsm_agencies' => AgencyConfigResource::collection(
                    WsmAgency::with('extractors')->orderBy('name')->get()
                )->resolve($request),
            ],
        ]);
    }

    public function show(Request $request, string $agencyType, int $agencyId): AgencyConfigResource
    {
        $this->authorizeView($request);

        return new AgencyConfigResource(
            $this->findAgency($agencyType, $agencyId)->load('extractors')
        );
    }

    public function refinement(Request $request, string $agencyType, int $agencyId): JsonResponse
    {
        $this->authorizeRefine($request);
        $agency = $this->findAgency($agencyType, $agencyId)->load('extractors');
        $evidence = $this->latestSuccessfulAttemptEvidence($agencyType, $agencyId);

        return response()->json([
            'data' => [
                'agency' => (new AgencyConfigResource($agency))->resolve($request),
                'evidence_available' => $evidence->isNotEmpty(),
                'evidence' => $evidence->values()->all(),
            ],
        ]);
    }

    public function storeAgency(Request $request, string $agencyType): JsonResponse
    {
        $this->authorizeManage($request);
        $data = $this->validateAgency($request, $agencyType);
        $modelClass = $this->agencyModel($agencyType);

        $agency = $modelClass::create($data)->load('extractors');

        return (new AgencyConfigResource($agency))->response()->setStatusCode(201);
    }

    public function updateAgency(Request $request, string $agencyType, int $agencyId): AgencyConfigResource
    {
        $this->authorizeManage($request);

        $agency = $this->findAgency($agencyType, $agencyId);
        $agency->update($this->validateAgency($request, $agencyType, $agencyId));

        return new AgencyConfigResource($agency->refresh()->load('extractors'));
    }

    public function destroyAgency(Request $request, string $agencyType, int $agencyId): JsonResponse
    {
        $this->authorizeManage($request);
        $agency = $this->findAgency($agencyType, $agencyId);

        DB::transaction(function () use ($agencyType, $agencyId, $agency): void {
            AgencyFieldExtractor::query()
                ->where('agency_type', $agencyType)
                ->where('agency_id', $agencyId)
                ->delete();
            $agency->delete();
        });

        return response()->json(['message' => 'Agência removida com sucesso.']);
    }

    public function storeExtractor(Request $request, string $agencyType, int $agencyId): JsonResponse
    {
        $this->authorizeManage($request);
        $this->findAgency($agencyType, $agencyId);

        $extractor = AgencyFieldExtractor::create(
            $this->validateExtractor($request) + [
                'agency_type' => $agencyType,
                'agency_id' => $agencyId,
            ]
        );

        return (new AgencyFieldExtractorResource($extractor))->response()->setStatusCode(201);
    }

    public function updateExtractor(Request $request, AgencyFieldExtractor $extractor): AgencyFieldExtractorResource
    {
        $this->authorizeManage($request);

        $extractor->update($this->validateExtractor($request, isUpdate: true));

        return new AgencyFieldExtractorResource($extractor->refresh());
    }

    public function destroyExtractor(Request $request, AgencyFieldExtractor $extractor): JsonResponse
    {
        $this->authorizeManage($request);

        $extractor->delete();

        return response()->json(['message' => 'Extractor removido com sucesso.']);
    }

    private function validateAgency(Request $request, string $agencyType, ?int $agencyId = null): array
    {
        $this->assertAgencyType($agencyType);

        $common = [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique($agencyType === 'sitemap' ? 'sitemap_agencies' : 'wsm_agencies', 'name')->ignore($agencyId),
            ],
            'domain' => [
                $agencyType === 'sitemap' ? 'required' : 'nullable',
                'string',
                'max:255',
                Rule::unique($agencyType === 'sitemap' ? 'sitemap_agencies' : 'wsm_agencies', 'domain')->ignore($agencyId),
            ],
            'is_active' => ['required', 'boolean'],
            'expected_min_items' => ['nullable', 'integer', 'min:0'],
        ];

        if ($agencyType === 'sitemap') {
            return $request->validate($common + [
                'sitemap_url' => ['required', 'url'],
                'allowed_url_patterns' => ['nullable', 'string'],
            ]);
        }

        return $request->validate($common + [
            'url' => ['required', 'url'],
            'url_pagination_template' => ['required', 'string'],
            'total_pages_selector_type' => ['required', Rule::in(['xpath', 'css', 'literal'])],
            'total_pages_selector_value' => ['required', 'string'],
            'total_pages_formula' => ['nullable', 'string'],
            'cards_to_iterate_selector_type' => ['required', Rule::in(['xpath', 'css'])],
            'cards_to_iterate_selector_value' => ['required', 'string'],
        ]);
    }

    private function validateExtractor(Request $request, bool $isUpdate = false): array
    {
        $required = $isUpdate ? 'sometimes' : 'required';

        return $request->validate([
            'field_name' => [$required, 'string', Rule::in(self::FIELD_NAMES)],
            'priority' => [$required, 'integer', 'min:1'],
            'source_type' => [$required, Rule::in(['xpath', 'css', 'og', 'jsonld', 'literal'])],
            'selector_value' => [$required, 'string'],
            'selector_index' => ['nullable', 'integer', 'min:0'],
            'selector_params' => ['nullable', 'array'],
            'selector_join' => [$required, 'boolean'],
            'pipeline' => ['nullable', 'string'],
            'output_type' => [$required, Rule::in(['text', 'number', 'boolean', 'image_url', 'link_url'])],
            'is_optional' => [$required, 'boolean'],
        ]);
    }

    private function findAgency(string $agencyType, int $agencyId): Model
    {
        $this->assertAgencyType($agencyType);

        $modelClass = $this->agencyModel($agencyType);

        return $modelClass::query()->findOrFail($agencyId);
    }

    private function agencyModel(string $agencyType): string
    {
        $this->assertAgencyType($agencyType);

        return $agencyType === 'sitemap' ? SitemapAgency::class : WsmAgency::class;
    }

    private function assertAgencyType(string $agencyType): void
    {
        abort_unless(in_array($agencyType, self::AGENCY_TYPES, true), 404, 'Tipo de agência inválido.');
    }

    private function latestSuccessfulAttemptEvidence(string $agencyType, int $agencyId): \Illuminate\Support\Collection
    {
        $attempt = DB::table('agency_onboarding_attempts')
            ->where('agency_type', $agencyType)
            ->where('agency_id', $agencyId)
            ->whereIn('outcome', ['active', 'saved_inactive'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->first();

        if (! $attempt) {
            return collect();
        }

        return DB::table('agency_onboarding_evidence')
            ->where('agency_onboarding_attempt_id', $attempt->id)
            ->orderBy('sample_index')
            ->get([
                'id',
                'agency_onboarding_attempt_id',
                'sample_index',
                'url',
                'content_hash',
                'html',
                'captured_at',
            ])
            ->map(fn (object $row): array => [
                'id' => $row->id,
                'attempt_id' => $row->agency_onboarding_attempt_id,
                'sample_index' => $row->sample_index,
                'url' => $row->url,
                'content_hash' => $row->content_hash,
                'html' => $row->html,
                'captured_at' => $row->captured_at,
            ]);
    }

    private function authorizeManage(Request $request): void
    {
        abort_unless($request->user()?->can('agency_configs.manage'), 403);
    }

    private function authorizeView(Request $request): void
    {
        abort_unless(
            $request->user()?->can('agency_configs.view')
                || $request->user()?->can('agency_configs.manage')
                || $request->user()?->can('agency_configs.refine'),
            403
        );
    }

    private function authorizeRefine(Request $request): void
    {
        abort_unless($request->user()?->can('agency_configs.refine'), 403);
    }
}
