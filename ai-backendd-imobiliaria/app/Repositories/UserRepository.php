<?php

namespace App\Repositories;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class UserRepository
{
    public function __construct(protected User $model)
    {
    }

    public function list(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = $this->model->newQuery()->with('roles:id,name');

        if (isset($filters['id']))
            $query->where('id', $filters['id']);
        if (isset($filters['name']))
            $query->where('name', 'like', '%' . $filters['name'] . '%');
        if (isset($filters['username']))
            $query->where('username', 'like', '%' . $filters['username'] . '%');
        if (isset($filters['team_id']))
            $query->where('team_id', $filters['team_id']);
        if (isset($filters['is_active']))
            $query->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        if (isset($filters['show_on_website']))
            $query->where('show_on_website', filter_var($filters['show_on_website'], FILTER_VALIDATE_BOOLEAN));
        if (isset($filters['is_online'])) {
            $isOnline = filter_var($filters['is_online'], FILTER_VALIDATE_BOOLEAN);
            $query->where(function (Builder $q) use ($isOnline) {
                if ($isOnline) {
                    $q->where('last_seen_at', '>=', now()->subMinutes(5));
                }
                else {
                    $q->whereNull('last_seen_at')->orWhere('last_seen_at', '<', now()->subMinutes(5));
                }
            });
        }

        return $query->orderBy('order')->paginate($perPage);
    }

    public function findById(int $id): ?User
    {
        return $this->model->with('roles:id,name')->find($id);
    }
    public function create(array $data): User
    {
        return $this->model->create($data);
    }
    public function update(User $user, array $data): User
    {
        $user->update($data);
        return $user->fresh();
    }
    public function delete(User $user): bool
    {
        return (bool)$user->delete();
    }
}
