<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crawler\DiscoverySnapshotUrlResource;
use App\Models\Crawler\DiscoverySnapshot;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DiscoverySnapshotController extends Controller
{
    public function urls(Request $request, DiscoverySnapshot $discoverySnapshot): AnonymousResourceCollection
    {
        $perPage = min(max($request->integer('per_page', 25), 1), 100);

        return DiscoverySnapshotUrlResource::collection(
            $discoverySnapshot->urls()->orderBy('id')->paginate($perPage)
        );
    }
}
