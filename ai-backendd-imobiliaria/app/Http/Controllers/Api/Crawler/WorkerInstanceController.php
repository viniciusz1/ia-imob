<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crawler\WorkerInstanceResource;
use App\Models\Crawler\WorkerInstance;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class WorkerInstanceController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return WorkerInstanceResource::collection(
            WorkerInstance::query()->orderBy('worker_key')->get()
        );
    }
}
