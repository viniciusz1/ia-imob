<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Property\StorePropertyRequest;
use App\Http\Requests\Property\UpdatePropertyRequest;
use App\Http\Resources\PropertyCollection;
use App\Http\Resources\PropertyResource;
use App\Models\Property;
use App\Services\PropertyService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

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
    public function index(Request $request)
    {
        \Illuminate\Support\Facades\Gate::authorize('viewAny', Property::class);
        $properties = $this->propertyService->listProperties($request->all());
        return new PropertyCollection($properties);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StorePropertyRequest $request)
    {
        \Illuminate\Support\Facades\Gate::authorize('create', Property::class);
        $property = $this->propertyService->createProperty($request->validated());
        return new PropertyResource($property->load(['images', 'features', 'broker', 'owner']));
    }

    /**
     * Display the specified resource.
     */
    public function show(Property $property)
    {
        \Illuminate\Support\Facades\Gate::authorize('view', $property);
        return new PropertyResource($property->load(['images', 'features', 'broker', 'owner']));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdatePropertyRequest $request, Property $property)
    {
        \Illuminate\Support\Facades\Gate::authorize('update', $property);
        $updatedProperty = $this->propertyService->updateProperty($property, $request->validated());
        return new PropertyResource($updatedProperty->load(['images', 'features', 'broker', 'owner']));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Property $property)
    {
        \Illuminate\Support\Facades\Gate::authorize('delete', $property);
        $this->propertyService->deleteProperty($property);
        return response()->noContent();
    }
}
