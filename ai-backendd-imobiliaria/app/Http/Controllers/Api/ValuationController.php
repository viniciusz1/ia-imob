<?php

namespace App\Http\Controllers\Api;

use App\Application\Valuation\CreateMarketValuation;
use App\Domain\Valuation\MarketValuationCalculator;
use App\Domain\Valuation\ValuationInput;
use App\Http\Controllers\Controller;
use App\Http\Requests\Valuation\StoreValuationRequest;
use App\Http\Resources\ValuationResource;
use App\Models\PropertyValuation;
use App\Services\Valuation\ComparableEvidenceExcelGenerator;
use App\Services\Valuation\SimplePdfReportGenerator;
use App\Services\Valuation\WordValuationReportGenerator;
use Illuminate\Http\Request;

class ValuationController extends Controller
{
    public function index(Request $request)
    {
        abort_unless($request->user()?->can('valuations.view'), 403);

        $valuations = PropertyValuation::query()
            ->with('user:id,name,email')
            ->latest()
            ->paginate((int) $request->input('per_page', 15));

        return ValuationResource::collection($valuations);
    }

    public function store(StoreValuationRequest $request, CreateMarketValuation $create)
    {
        $data = $request->validated();

        $valuation = $create->execute($request->user(), new ValuationInput(
            city: (array) $data['city'],
            neighborhood: (array) $data['neighborhood'],
            residentialType: $data['residential_type'],
            area: (float) $data['area'],
            bedrooms: (int) $data['bedrooms'],
            bathrooms: (int) $data['bathrooms'],
            garageSpaces: (int) $data['garage_spaces'],
            floodRisk: (bool) $data['flood_risk'],
        ), $data['comparable_reviews'] ?? null);

        return (new ValuationResource($valuation))->response()->setStatusCode(201);
    }

    public function candidates(StoreValuationRequest $request, MarketValuationCalculator $calculator)
    {
        $data = $request->validated();

        $candidates = $calculator->comparableCandidates(new ValuationInput(
            city: (array) $data['city'],
            neighborhood: (array) $data['neighborhood'],
            residentialType: $data['residential_type'],
            area: (float) $data['area'],
            bedrooms: (int) $data['bedrooms'],
            bathrooms: (int) $data['bathrooms'],
            garageSpaces: (int) $data['garage_spaces'],
            floodRisk: (bool) $data['flood_risk'],
        ));

        return response()->json(['data' => $candidates]);
    }

    public function show(Request $request, PropertyValuation $valuation): ValuationResource
    {
        abort_unless($request->user()?->can('valuations.view'), 403);

        return new ValuationResource($valuation->load('user:id,name,email'));
    }

    public function report(Request $request, PropertyValuation $valuation, SimplePdfReportGenerator $generator)
    {
        abort_unless($request->user()?->can('valuations.view'), 403);
        abort_unless($valuation->status === PropertyValuation::STATUS_CALCULATED, 404);

        $valuation->load('user:id,name,email', 'agency.siteSettings');
        $filename = $valuation->code.'.pdf';

        return response($generator->generate($valuation), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    public function wordReport(Request $request, PropertyValuation $valuation, WordValuationReportGenerator $generator)
    {
        abort_unless($request->user()?->can('valuations.view'), 403);
        abort_unless($valuation->status === PropertyValuation::STATUS_CALCULATED, 404);

        $valuation->load('user:id,name,email', 'agency.siteSettings');
        $filename = $valuation->code.'.docx';

        return response($generator->generate($valuation), 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    public function comparableEvidence(Request $request, PropertyValuation $valuation, ComparableEvidenceExcelGenerator $generator)
    {
        abort_unless($request->user()?->can('valuations.view'), 403);
        abort_unless($valuation->status === PropertyValuation::STATUS_CALCULATED, 404);

        $valuation->load('agency');
        $filename = $valuation->code.'-comparaveis.xlsx';

        return response($generator->generate($valuation), 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }
}
