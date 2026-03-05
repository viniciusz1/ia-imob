<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\IndexPermissionRequest;
use App\Http\Resources\PermissionResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Spatie\Permission\Models\Permission;

class PermissionController extends Controller
{
    public function index(IndexPermissionRequest $request): AnonymousResourceCollection
    {
        $guard = (string) config('auth.defaults.guard', 'web');

        return PermissionResource::collection(
            Permission::query()
                ->where('guard_name', $guard)
                ->get()
        );
    }
}
