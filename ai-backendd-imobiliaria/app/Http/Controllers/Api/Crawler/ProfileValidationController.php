<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crawler\CrawlerOperationResource;
use App\Http\Resources\Crawler\ProfileValidationRecordResource;
use App\Http\Resources\Crawler\ProfileValidationReportResource;
use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\ExtractionProfile;
use App\Models\Crawler\ProfileValidationReport;
use App\Services\Crawler\ExtractionProfileWorkflowService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

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
        return new ProfileValidationReportResource($profileValidationReport);
    }

    public function records(
        Request $request,
        CrawlAgency $crawlAgency,
        ExtractionProfile $extractionProfile,
        ProfileValidationReport $profileValidationReport,
    ): AnonymousResourceCollection {
        abort_unless(
            $extractionProfile->crawl_agency_id === $crawlAgency->id
            && $profileValidationReport->extraction_profile_id === $extractionProfile->id,
            404,
        );

        $filters = $request->validate([
            'filter' => ['nullable', Rule::in(['all', 'issues'])],
            'search' => ['nullable', 'string', 'max:2048'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:20'],
        ]);

        $records = $profileValidationReport->records()
            ->when(($filters['filter'] ?? 'all') === 'issues', fn ($query) => $query->where(
                fn ($issues) => $issues
                    ->where('is_valid', false)
                    ->orWhereRaw("jsonb_typeof(normalized_data #> '{_quality,warnings}') = 'array' AND jsonb_array_length(normalized_data #> '{_quality,warnings}') > 0")
            ))
            ->when($filters['search'] ?? null, fn ($query, $search) => $query->where('url', 'like', "%{$search}%"))
            ->orderBy('id')
            ->paginate((int) ($filters['per_page'] ?? 5))
            ->withQueryString();

        return ProfileValidationRecordResource::collection($records);
    }
}
