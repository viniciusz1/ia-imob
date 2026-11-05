<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\IndexPermissionRequest;
use App\Http\Resources\PermissionResource;
use App\Support\PermissionGuard;
use App\Support\PlatformPermissions;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Spatie\Permission\Models\Permission;

class PermissionController extends Controller
{
    public function index(IndexPermissionRequest $request): AnonymousResourceCollection
    {
        $guard = PermissionGuard::name();

        $query = Permission::query()->where('guard_name', $guard);

        if (PlatformPermissions::isAgencyActor($request->user())) {
            PlatformPermissions::whereAgency($query);
        }

        return PermissionResource::collection($query->get());
    }
}
