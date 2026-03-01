<?php

namespace App\Services;

use App\Models\Property;
use App\Repositories\Contracts\PropertyRepositoryInterface;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PropertyService
{
    protected $propertyRepository;

    public function __construct(PropertyRepositoryInterface $propertyRepository)
    {
        $this->propertyRepository = $propertyRepository;
    }

    /**
     * Get paginated properties.
     *
     * @param array $filters
     * @return LengthAwarePaginator
     */
    public function listProperties(array $filters = []): LengthAwarePaginator
    {
        return $this->propertyRepository->paginate($filters);
    }

    /**
     * Get a single property by ID.
     *
     * @param int $id
     * @return Property|null
     */
    public function getProperty(int $id): ?Property
    {
        return $this->propertyRepository->find($id);
    }

    /**
     * Create a new property.
     *
     * @param array $data
     * @return Property
     */
    public function createProperty(array $data): Property
    {
        $this->validateExclusivity($data);

        return $this->propertyRepository->create($data);
    }

    /**
     * Update an existing property.
     *
     * @param Property $property
     * @param array $data
     * @return Property
     */
    public function updateProperty(Property $property, array $data): Property
    {
        $this->validateExclusivity($data);

        return $this->propertyRepository->update($property, $data);
    }

    /**
     * Delete a property.
     *
     * @param Property $property
     * @return bool
     */
    public function deleteProperty(Property $property): bool
    {
        return $this->propertyRepository->delete($property);
    }

    /**
     * Validate exclusivity rules.
     *
     * @param array $data
     * @throws InvalidArgumentException
     */
    protected function validateExclusivity(array $data): void
    {
        if (!empty($data['has_exclusive_right']) && empty($data['exclusive_right_expiration_date'])) {
            throw new InvalidArgumentException('Exclusive right expiration date is required when exclusivity is enabled.');
        }
    }
}
