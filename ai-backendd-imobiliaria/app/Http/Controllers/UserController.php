<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use App\Models\User;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class UserController extends Controller
{
    use AuthorizesRequests;

    public function __construct(protected UserService $service)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', User::class);
        $filters = $request->only(['id', 'name', 'username', 'team_id', 'is_active', 'show_on_website', 'is_online']);
        $users = $this->service->list($filters, (int) $request->input('per_page', 15));
        return UserResource::collection($users);
    }

    public function show(int $user): UserResource
    {
        $found = $this->service->findOrFail($user);
        $this->authorize('view', $found);
        return new UserResource($found);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        try {
            $this->authorize('create', User::class);
            $user = $this->service->create($request->validated(), $request->file('avatar'));
            return (new UserResource($user))->response()->setStatusCode(201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ], 500);
        }
    }

    public function update(UpdateUserRequest $request, int $user): UserResource
    {
        $found = $this->service->findOrFail($user);
        $this->authorize('update', $found);
        $updated = $this->service->update($found, $request->validated(), $request->file('avatar'));
        return new UserResource($updated);
    }

    public function destroy(int $user): JsonResponse
    {
        $found = $this->service->findOrFail($user);
        $this->authorize('delete', $found);
        $this->service->delete($found);
        return response()->json(['message' => 'Usuário removido com sucesso.'], 200);
    }
}
