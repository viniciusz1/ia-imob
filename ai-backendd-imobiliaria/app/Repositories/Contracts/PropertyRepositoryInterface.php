<?php

namespace App\Repositories\Contracts;

use App\Models\Property;
use Illuminate\Pagination\LengthAwarePaginator;

interface PropertyRepositoryInterface
{
    /**
     * Get paginated properties with optional filters.
     */
    public function paginate(array $filters = []): LengthAwarePaginator;

    /**
     * Find a property by ID.
     */
    public function find(int $id): ?Property;

    /**
     * Find a property by reference code.
     */
    public function findByReferenceCode(string $code): ?Property;

    /**
     * Create a new property.
     */
    public function create(array $data): Property;

    /**
     * Update an existing property.
     */
    public function update(Property $property, array $data): Property;

    /**
     * Delete a property.
     */
    public function delete(Property $property): bool;
}
