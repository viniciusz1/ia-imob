<?php

namespace App\Repositories;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class UserRepository
{
    public function __construct(protected User $model) {}

    public function list(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = $this->model->newQuery()->with('roles:id,name');

        $this->constrainToCurrentAgency($query);

        if (isset($filters['id'])) {
            $query->where('id', $filters['id']);
        }
        if (isset($filters['name'])) {
            $query->where('name', 'like', '%'.$filters['name'].'%');
        }
        if (isset($filters['username'])) {
            $query->where('username', 'like', '%'.$filters['username'].'%');
        }
        if (isset($filters['team_id'])) {
            $query->where('team_id', $filters['team_id']);
        }
        if (isset($filters['is_active'])) {
            $query->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }
        if (isset($filters['show_on_website'])) {
            $query->where('show_on_website', filter_var($filters['show_on_website'], FILTER_VALIDATE_BOOLEAN));
        }
        if (isset($filters['is_online'])) {
            $isOnline = filter_var($filters['is_online'], FILTER_VALIDATE_BOOLEAN);
            $query->where(function (Builder $q) use ($isOnline) {
                if ($isOnline) {
                    $q->where('last_seen_at', '>=', now()->subMinutes(5));
                } else {
                    $q->whereNull('last_seen_at')->orWhere('last_seen_at', '<', now()->subMinutes(5));
                }
            });
        }

        return $query->orderBy('order')->paginate($perPage);
    }

    public function findById(int $id): ?User
    {
        $query = $this->model->newQuery()->with('roles:id,name');

        $this->constrainToCurrentAgency($query);

        return $query->find($id);
    }

    /**
     * Restrict a user query to the authenticated actor's own Agency.
     *
     * `users` has an `agency_id` but no Agency Scope, so every read path has to
     * apply the boundary itself. An agency-less actor (a Platform Admin) sees
     * the other agency-less users rather than everyone: you see the users of
     * your own scope, never another Agency's.
     *
     * With no actor at all — CLI, seeders — no constraint is applied, matching
     * how AgencyScope treats an unresolvable Agency.
     */
    private function constrainToCurrentAgency(Builder $query): void
    {
        $actor = auth()->user();

        if ($actor === null) {
            return;
        }

        if ($actor->agency_id === null) {
            $query->whereNull('users.agency_id');

            return;
        }

        $query->where('users.agency_id', $actor->agency_id);
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
        return (bool) $user->delete();
    }
}
