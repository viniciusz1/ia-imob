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
use App\Models\User;
use App\Support\PermissionGuard;
use App\Support\PlatformPermissions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function index(ManageRolesRequest $request): AnonymousResourceCollection
    {
        $guard = PermissionGuard::name();

        $query = Role::with('permissions')->where('guard_name', $guard);

        if (PlatformPermissions::isAgencyActor($request->user())) {
            $query->whereDoesntHave('permissions', fn (Builder $permissions) => PlatformPermissions::wherePlatform($permissions));
        }

        return RoleResource::collection($query->get());
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
        $this->ensureAgencyCanManage($request->user(), $role);

        return new RoleResource($role->load('permissions'));
    }

    public function update(UpdateRoleRequest $request, Role $role, UpdateRoleAction $action): RoleResource
    {
        $this->ensureRoleGuard($role);
        $this->ensureAgencyCanManage($request->user(), $role);

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
        $this->ensureAgencyCanManage($request->user(), $role);
        $action->execute($role);

        return response()->json(['message' => 'Grupo removido com sucesso.'], 200);
    }

    /** Agency users can't read, change or remove a group that carries platform capabilities. */
    private function ensureAgencyCanManage(?User $actor, Role $role): void
    {
        abort_if(
            PlatformPermissions::isAgencyActor($actor) && PlatformPermissions::roleGrantsPlatformAccess($role),
            403,
            'Este grupo é exclusivo da plataforma.'
        );
    }

    private function ensureRoleGuard(Role $role): void
    {
        $guard = PermissionGuard::name();
        abort_if($role->guard_name !== $guard, 404, 'Grupo não encontrado.');
    }
}
