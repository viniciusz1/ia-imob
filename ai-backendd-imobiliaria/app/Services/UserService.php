<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\UserRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UserService
{
    public function __construct(protected UserRepository $repository)
    {
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
        $data['password'] = Hash::make($data['password']);
        if ($avatar)
            $data['avatar_path'] = $avatar->storeAs('avatars', Str::uuid() . '.' . $avatar->extension(), 'public');
        return $this->repository->create($data);
    }

    public function update(User $user, array $data, ?UploadedFile $avatar = null): User
    {
        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }
        else {
            unset($data['password']);
        }
        if ($avatar) {
            if ($user->avatar_path && Storage::disk('public')->exists($user->avatar_path)) {
                Storage::disk('public')->delete($user->avatar_path);
            }
            $data['avatar_path'] = $avatar->storeAs('avatars', Str::uuid() . '.' . $avatar->extension(), 'public');
        }
        return $this->repository->update($user, $data);
    }

    public function delete(User $user): bool
    {
        return $this->repository->delete($user);
    }
}
