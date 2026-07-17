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
        return PermissionResource::collection(
            Permission::query()
                ->where('guard_name', $this->permissionGuard())
                ->get()
        );
    }

    /**
     * Fixed guard for Spatie permissions (auth:sanctum mutates the default guard at runtime).
     */
    private function permissionGuard(): string
    {
        return 'web';
    }
}
