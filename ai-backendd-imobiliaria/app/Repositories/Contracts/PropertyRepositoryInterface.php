<?php

namespace App\Repositories\Contracts;

use App\Models\Property;
use Illuminate\Pagination\LengthAwarePaginator;

interface PropertyRepositoryInterface
{
    /**
     * Get paginated properties with optional filters.
     *
     * @param array $filters
     * @return LengthAwarePaginator
     */
    public function paginate(array $filters = []): LengthAwarePaginator;

    /**
     * Find a property by ID.
     *
     * @param int $id
     * @return Property|null
     */
    public function find(int $id): ?Property;

    /**
     * Find a property by reference code.
     *
     * @param string $code
     * @return Property|null
     */
    public function findByReferenceCode(string $code): ?Property;

    /**
     * Create a new property.
     *
     * @param array $data
     * @return Property
     */
    public function create(array $data): Property;

    /**
     * Update an existing property.
     *
     * @param Property $property
     * @param array $data
     * @return Property
     */
    public function update(Property $property, array $data): Property;

    /**
     * Delete a property.
     *
     * @param Property $property
     * @return bool
     */
    public function delete(Property $property): bool;
}
