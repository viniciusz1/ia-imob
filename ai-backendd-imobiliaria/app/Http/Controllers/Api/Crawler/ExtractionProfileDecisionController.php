<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crawler\DecideExtractionProfileRequest;
use App\Http\Resources\Crawler\ExtractionProfileResource;
use App\Models\Crawler\ExtractionProfile;
use App\Services\Crawler\ExtractionProfileWorkflowService;
use Illuminate\Http\Request;

class ExtractionProfileDecisionController extends Controller
{
    public function decide(
        DecideExtractionProfileRequest $request,
        ExtractionProfile $extractionProfile,
        ExtractionProfileWorkflowService $workflow,
    ): ExtractionProfileResource {
        return new ExtractionProfileResource($workflow->decide(
            $extractionProfile,
            $request->validated('decision'),
            $request->validated('reason'),
            $request->user(),
        ));
    }

    public function activate(
        Request $request,
        ExtractionProfile $extractionProfile,
        ExtractionProfileWorkflowService $workflow,
    ): ExtractionProfileResource {
        return new ExtractionProfileResource($workflow->activate($extractionProfile, $request->user()));
    }
}
