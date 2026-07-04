<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Property\DestroyPropertyRequest;
use App\Http\Requests\Property\IndexPropertyRequest;
use App\Http\Requests\Property\ShowPropertyRequest;
use App\Http\Requests\Property\StorePropertyRequest;
use App\Http\Requests\Property\UpdatePropertyRequest;
use App\Http\Resources\PropertyCollection;
use App\Http\Resources\PropertyResource;
use App\Models\Property;
use App\Services\PropertyService;

class PropertyController extends Controller
{
    protected $propertyService;

    public function __construct(PropertyService $propertyService)
    {
        $this->propertyService = $propertyService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(IndexPropertyRequest $request)
    {
        $properties = $this->propertyService->listProperties($request->all());

        return new PropertyCollection($properties);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StorePropertyRequest $request)
    {
        $property = $this->propertyService->createProperty($request->validated());

        return new PropertyResource($property->load(['images', 'features', 'broker', 'owner']));
    }

    /**
     * Display the specified resource.
     */
    public function show(ShowPropertyRequest $request, Property $property)
    {
        return new PropertyResource($property->load(['images', 'features', 'broker', 'owner']));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdatePropertyRequest $request, Property $property)
    {
        $updatedProperty = $this->propertyService->updateProperty($property, $request->validated());

        return new PropertyResource($updatedProperty->load(['images', 'features', 'broker', 'owner']));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(DestroyPropertyRequest $request, Property $property)
    {
        $this->propertyService->deleteProperty($property);

        return response()->noContent();
    }
}
