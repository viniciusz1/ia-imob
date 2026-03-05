<?php

namespace App\Http\Controllers\Api;

use App\Actions\Role\CreateRoleAction;
use App\Actions\Role\DeleteRoleAction;
use App\Actions\Role\UpdateRoleAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\ManageRolesRequest;
use App\Http\Requests\StoreRoleRequest;
use App\Http\Requests\UpdateRoleRequest;
use App\Http\Resources\RoleResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function index(ManageRolesRequest $request): AnonymousResourceCollection
    {
        $guard = (string) config('auth.defaults.guard', 'web');

        return RoleResource::collection(
            Role::with('permissions')
                ->where('guard_name', $guard)
                ->get()
        );
    }

    public function store(StoreRoleRequest $request, CreateRoleAction $action): JsonResponse
    {
        $role = $action->execute(
            $request->validated('name'),
            $request->validated('permissions') ?? []
        );

        return (new RoleResource($role->load('permissions')))->response()->setStatusCode(201);
    }

    public function show(ManageRolesRequest $request, Role $role): RoleResource
    {
        $this->ensureRoleGuard($role);
        return new RoleResource($role->load('permissions'));
    }

    public function update(UpdateRoleRequest $request, Role $role, UpdateRoleAction $action): RoleResource
    {
        $this->ensureRoleGuard($role);

        $updatedRole = $action->execute(
            $role,
            $request->validated('name'),
            $request->validated('permissions') ?? []
        );

        return new RoleResource($updatedRole->load('permissions'));
    }

    public function destroy(ManageRolesRequest $request, Role $role, DeleteRoleAction $action): JsonResponse
    {
        $this->ensureRoleGuard($role);
        $action->execute($role);

        return response()->json(['message' => 'Grupo removido com sucesso.'], 200);
    }

    private function ensureRoleGuard(Role $role): void
    {
        $guard = (string) config('auth.defaults.guard', 'web');
        abort_if($role->guard_name !== $guard, 404, 'Grupo não encontrado.');
    }
}
