<?php

namespace App\Http\Controllers;

use App\Http\Requests\DestroyUserRequest;
use App\Http\Requests\IndexUserRequest;
use App\Http\Requests\ShowUserRequest;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UserController extends Controller
{
    public function __construct(protected UserService $service)
    {
    }

    public function index(IndexUserRequest $request): AnonymousResourceCollection
    {
        $filters = $request->only(['id', 'name', 'username', 'team_id', 'is_active', 'show_on_website', 'is_online']);
        $users = $this->service->list($filters, (int) $request->input('per_page', 15));
        return UserResource::collection($users);
    }

    public function show(ShowUserRequest $request, int $user): UserResource
    {
        $found = $this->service->findOrFail($user);
        return new UserResource($found);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        try {
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
        $updated = $this->service->update($found, $request->validated(), $request->file('avatar'));
        return new UserResource($updated);
    }

    public function destroy(DestroyUserRequest $request, int $user): JsonResponse
    {
        $found = $this->service->findOrFail($user);
        $this->service->delete($found);
        return response()->json(['message' => 'Usuário removido com sucesso.'], 200);
    }
}
