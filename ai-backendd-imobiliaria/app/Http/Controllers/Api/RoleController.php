<?php

namespace App\Http\Controllers\Api;

use App\Actions\Role\CreateRoleAction;
use App\Actions\Role\DeleteRoleAction;
use App\Actions\Role\UpdateRoleAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRoleRequest;
use App\Http\Requests\UpdateRoleRequest;
use App\Http\Resources\RoleResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Spatie\Permission\Models\Role;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class RoleController extends Controller
{
    use AuthorizesRequests;

    public function index(): AnonymousResourceCollection
    {
        $this->authorize('roles.manage');
        return RoleResource::collection(Role::with('permissions')->get());
    }

    public function store(StoreRoleRequest $request, CreateRoleAction $action): JsonResponse
    {
        $role = $action->execute(
            $request->validated('name'),
            $request->validated('permissions') ?? []
        );

        return (new RoleResource($role->load('permissions')))->response()->setStatusCode(201);
    }

    public function show(Role $role): RoleResource
    {
        $this->authorize('roles.manage');
        return new RoleResource($role->load('permissions'));
    }

    public function update(UpdateRoleRequest $request, Role $role, UpdateRoleAction $action): RoleResource
    {
        $updatedRole = $action->execute(
            $role,
            $request->validated('name'),
            $request->validated('permissions') ?? []
        );

        return new RoleResource($updatedRole->load('permissions'));
    }

    public function destroy(Role $role, DeleteRoleAction $action): JsonResponse
    {
        $this->authorize('roles.manage');
        $action->execute($role);

        return response()->json(['message' => 'Grupo removido com sucesso.'], 200);
    }
}
