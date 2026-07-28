<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crawler\OnboardingExecutionResource;
use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\OnboardingExecution;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OnboardingExecutionController extends Controller
{
    public function index(CrawlAgency $crawlAgency): AnonymousResourceCollection
    {
        return OnboardingExecutionResource::collection(
            OnboardingExecution::query()
                ->with($this->relations())
                ->where('crawl_agency_id', $crawlAgency->id)
                ->latest('id')
                ->get(),
        );
    }

    public function show(OnboardingExecution $onboardingExecution): OnboardingExecutionResource
    {
        return new OnboardingExecutionResource(
            $onboardingExecution->load($this->relations()),
        );
    }

    private function relations(): array
    {
        return [
            'crawlAgency',
            'executionModel',
            'discoveryPolicy',
            'extractionPolicy',
            'operations' => fn ($query) => $query->orderBy('id'),
        ];
    }
}
