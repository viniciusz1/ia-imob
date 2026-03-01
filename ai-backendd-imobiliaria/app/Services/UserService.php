<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\UserRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Actions\User\AssignRoleToUserAction;

class UserService
{
    public function __construct(
        protected UserRepository $repository,
        protected AssignRoleToUserAction $assignRoleAction
    ) {
    }

    public function list(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->list($filters, $perPage);
    }

    public function findOrFail(int $id): User
    {
        $user = $this->repository->findById($id);
        if (!$user)
            abort(404, 'Usuário não encontrado.');
        return $user;
    }

    public function create(array $data, ?UploadedFile $avatar = null): User
    {
        $roleId = $data['role_id'] ?? null;
        unset($data['role_id']);

        $data['password'] = Hash::make($data['password']);
        if ($avatar)
            $data['avatar_path'] = $avatar->storeAs('avatars', Str::uuid() . '.' . $avatar->extension(), 'public');

        $user = $this->repository->create($data);

        if ($roleId) {
            $this->assignRoleAction->execute($user, $roleId);
        }

        return $user;
    }

    public function update(User $user, array $data, ?UploadedFile $avatar = null): User
    {
        $hasRoleUpdate = array_key_exists('role_id', $data);
        $roleId = $data['role_id'] ?? null;
        unset($data['role_id']);

        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }
        if ($avatar) {
            if ($user->avatar_path && Storage::disk('public')->exists($user->avatar_path)) {
                Storage::disk('public')->delete($user->avatar_path);
            }
            $data['avatar_path'] = $avatar->storeAs('avatars', Str::uuid() . '.' . $avatar->extension(), 'public');
        }

        $user = $this->repository->update($user, $data);

        if ($hasRoleUpdate) {
            $this->assignRoleAction->execute($user, $roleId);
        }

        return $user;
    }

    public function delete(User $user): bool
    {
        return $this->repository->delete($user);
    }
}
