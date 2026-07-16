<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crawler\StoreQualityPolicyRequest;
use App\Http\Resources\Crawler\QualityPolicyResource;
use App\Models\Crawler\QualityPolicyVersion;
use App\Services\Crawler\QualityPolicyService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class QualityPolicyController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return QualityPolicyResource::collection(QualityPolicyVersion::query()->latest('version')->get());
    }

    public function store(StoreQualityPolicyRequest $request, QualityPolicyService $service): QualityPolicyResource
    {
        return new QualityPolicyResource($service->create($request->validated('rules'), $request->user()));
    }

    public function validatePolicy(QualityPolicyVersion $qualityPolicy, QualityPolicyService $service): QualityPolicyResource
    {
        return new QualityPolicyResource($service->validate($qualityPolicy));
    }

    public function activate(Request $request, QualityPolicyVersion $qualityPolicy, QualityPolicyService $service): QualityPolicyResource
    {
        return new QualityPolicyResource($service->activate($qualityPolicy, $request->user()));
    }
}
