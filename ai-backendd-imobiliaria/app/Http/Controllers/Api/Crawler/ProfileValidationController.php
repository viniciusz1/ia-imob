<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crawler\CrawlerOperationResource;
use App\Http\Resources\Crawler\ProfileValidationReportResource;
use App\Models\Crawler\ExtractionProfile;
use App\Models\Crawler\ProfileValidationReport;
use App\Services\Crawler\ExtractionProfileWorkflowService;
use Illuminate\Http\Request;

class ProfileValidationController extends Controller
{
    public function store(
        Request $request,
        ExtractionProfile $extractionProfile,
        ExtractionProfileWorkflowService $workflow,
    ): CrawlerOperationResource {
        return new CrawlerOperationResource(
            $workflow->queueValidation($extractionProfile, $request->user())
        );
    }

    public function show(ProfileValidationReport $profileValidationReport): ProfileValidationReportResource
    {
        return new ProfileValidationReportResource($profileValidationReport->load('records'));
    }
}
