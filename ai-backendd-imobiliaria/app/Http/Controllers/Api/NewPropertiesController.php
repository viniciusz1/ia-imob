<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\NewProperties\IndexNewPropertiesRequest;
use App\Http\Resources\NewProperties\NewPropertyAgencyResource;
use App\Services\NewProperties\NewPropertiesQueryService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class NewPropertiesController extends Controller
{
    public function __invoke(
        IndexNewPropertiesRequest $request,
        NewPropertiesQueryService $service,
    ): AnonymousResourceCollection {
        $result = $service->get();

        return NewPropertyAgencyResource::collection($result['groups'])
            ->additional(['meta' => $result['meta']]);
    }
}
