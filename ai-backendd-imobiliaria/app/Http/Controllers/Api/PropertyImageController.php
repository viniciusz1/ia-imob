<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PropertyImageResource;
use App\Models\Property;
use App\Models\PropertyImage;
use App\Services\PropertyImageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PropertyImageController extends Controller
{
    protected $imageService;

    public function __construct(PropertyImageService $imageService)
    {
        $this->imageService = $imageService;
    }

    /**
     * Upload an image to a property.
     */
    public function store(Request $request, Property $property)
    {
        $request->validate([
            'image' => ['required', 'image', 'max:5120'], // 5MB max
            'description' => ['nullable', 'string', 'max:255'],
            'is_cover' => ['sometimes', 'boolean'],
        ]);

        $image = $this->imageService->storeImage($property, $request->file('image'), $request->all());

        return new PropertyImageResource($image);
    }

    /**
     * Set image as cover.
     */
    public function setCover(Property $property, PropertyImage $image)
    {
        if ($image->property_id !== $property->id) {
            abort(403);
        }

        $this->imageService->setAsCover($image);

        return response()->json(['message' => 'Cover image updated successfully.']);
    }

    /**
     * Delete an image.
     */
    public function destroy(Property $property, PropertyImage $image)
    {
        if ($image->property_id !== $property->id) {
            abort(403);
        }

        $this->imageService->deleteImage($image);

        return response()->noContent();
    }

    /**
     * Reorder images.
     */
    public function reorder(Request $request, Property $property)
    {
        $validator = Validator::make($request->all(), [
            'order' => ['required', 'array'],
            'order.*' => ['required', 'integer', 'min:1'],
        ]);

        $validator->after(function ($validator) use ($request, $property) {
            $orderMap = $request->input('order', []);
            $imageIds = array_map('intval', array_keys($orderMap));

            if (empty($imageIds)) {
                return;
            }

            $matchedIdsCount = PropertyImage::query()
                ->where('property_id', $property->id)
                ->whereIn('id', $imageIds)
                ->count();

            if ($matchedIdsCount !== count($imageIds)) {
                $validator->errors()->add('order', 'A lista de imagens contem IDs invalidos para este imovel.');
            }
        });

        $validator->validate();

        $this->imageService->reorderImages($request->input('order'));

        return response()->json(['message' => 'Order updated successfully.']);
    }
}
