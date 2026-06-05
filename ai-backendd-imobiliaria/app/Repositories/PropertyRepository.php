<?php

namespace App\Repositories;

use App\Models\Property;
use App\Repositories\Contracts\PropertyRepositoryInterface;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class PropertyRepository implements PropertyRepositoryInterface
{
    /**
     * {@inheritDoc}
     */
    public function paginate(array $filters = []): LengthAwarePaginator
    {
        $query = Property::query()
            ->with(['images' => function ($q) {
                $q->where('is_cover', true);
            }, 'broker:id,name', 'features:id,name']);

        // Filter by reference code (partial search)
        if (! empty($filters['reference_code'])) {
            $query->where('reference_code', 'like', '%'.$filters['reference_code'].'%');
        }

        // Filter by text (title or description)
        if (! empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('title', 'like', '%'.$filters['search'].'%')
                    ->orWhere('description', 'like', '%'.$filters['search'].'%');
            });
        }

        // Filter by property type
        if (! empty($filters['property_type'])) {
            $query->where('property_type', $filters['property_type']);
        }

        // Filter by purpose
        if (! empty($filters['purpose'])) {
            $query->where('purpose', $filters['purpose']);
        }

        // Filter by status
        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        // Filter by city
        if (! empty($filters['city'])) {
            $query->where('city', $filters['city']);
        }

        // Filter by neighborhood
        if (! empty($filters['neighborhood'])) {
            $query->where('neighborhood', 'like', '%'.$filters['neighborhood'].'%');
        }

        // Pricing filters
        if (! empty($filters['min_price'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('sale_price', '>=', $filters['min_price'])
                    ->orWhere('rent_price', '>=', $filters['min_price']);
            });
        }
        if (! empty($filters['max_price'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('sale_price', '<=', $filters['max_price'])
                    ->orWhere('rent_price', '<=', $filters['max_price']);
            });
        }

        // Area filters
        if (! empty($filters['min_area'])) {
            $query->where('usable_area', '>=', $filters['min_area']);
        }
        if (! empty($filters['max_area'])) {
            $query->where('usable_area', '<=', $filters['max_area']);
        }

        // Room filters
        if (! empty($filters['bedrooms'])) {
            $query->where('bedrooms', '>=', $filters['bedrooms']);
        }
        if (! empty($filters['suites'])) {
            $query->where('suites', '>=', $filters['suites']);
        }
        if (! empty($filters['bathrooms'])) {
            $query->where('bathrooms', '>=', $filters['bathrooms']);
        }
        if (! empty($filters['garage_spaces'])) {
            $query->where('garage_spaces', '>=', $filters['garage_spaces']);
        }

        // Filter by features (Many to Many)
        if (! empty($filters['features']) && is_array($filters['features'])) {
            foreach ($filters['features'] as $featureId) {
                $query->whereHas('features', function ($q) use ($featureId) {
                    $q->where('features.id', $featureId);
                });
            }
        }

        // Filter by highlight/published
        if (isset($filters['is_published'])) {
            $query->where('is_published', (bool) $filters['is_published']);
        }
        if (isset($filters['is_highlighted'])) {
            $query->where('is_highlighted', (bool) $filters['is_highlighted']);
        }

        // Ordering
        $orderBy = $filters['order_by'] ?? 'created_at';
        $direction = $filters['direction'] ?? 'desc';
        $query->orderBy($orderBy, $direction);

        return $query->paginate($filters['per_page'] ?? 15);
    }

    /**
     * {@inheritDoc}
     */
    public function find(int $id): ?Property
    {
        return Property::with(['images', 'features', 'broker', 'owner'])->find($id);
    }

    /**
     * {@inheritDoc}
     */
    public function findByReferenceCode(string $code): ?Property
    {
        return Property::with(['images', 'features', 'broker', 'owner'])->where('reference_code', $code)->first();
    }

    /**
     * {@inheritDoc}
     */
    public function create(array $data): Property
    {
        return DB::transaction(function () use ($data) {
            $property = Property::create($data);

            if (isset($data['features'])) {
                $property->features()->sync($data['features']);
            }

            return $property;
        });
    }

    /**
     * {@inheritDoc}
     */
    public function update(Property $property, array $data): Property
    {
        return DB::transaction(function () use ($property, $data) {
            $property->update($data);

            if (isset($data['features'])) {
                $property->features()->sync($data['features']);
            }

            return $property;
        });
    }

    /**
     * {@inheritDoc}
     */
    public function delete(Property $property): bool
    {
        return $property->delete();
    }
}
