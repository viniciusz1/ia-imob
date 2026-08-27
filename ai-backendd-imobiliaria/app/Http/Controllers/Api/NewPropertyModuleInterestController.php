<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Actions\NewProperties\RecordNewPropertyModuleInterestAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\NewProperties\ShowNewPropertyModuleInterestRequest;
use App\Http\Requests\NewProperties\StoreNewPropertyModuleInterestRequest;
use App\Http\Resources\Api\NewPropertyModuleInterestResource;
use App\Models\NewPropertyModuleInterest;
use Illuminate\Http\JsonResponse;

class NewPropertyModuleInterestController extends Controller
{
    public function show(
        ShowNewPropertyModuleInterestRequest $request,
    ): NewPropertyModuleInterestResource {
        $interest = NewPropertyModuleInterest::query()
            ->where('user_id', $request->user()->id)
            ->first();

        return NewPropertyModuleInterestResource::make($interest);
    }

    public function store(
        StoreNewPropertyModuleInterestRequest $request,
        RecordNewPropertyModuleInterestAction $action,
    ): JsonResponse {
        $interest = $action->execute($request->user(), $request->validated());
        $status = $interest->wasRecentlyCreated ? 201 : 200;

        return (new NewPropertyModuleInterestResource($interest))
            ->response()
            ->setStatusCode($status);
    }
}
