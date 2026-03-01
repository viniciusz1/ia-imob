<?php

namespace App\Services;

use App\Models\Property;
use App\Models\PropertyImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class PropertyImageService
{
    /**
     * Store a new image for a property.
     *
     * @param Property $property
     * @param UploadedFile $file
     * @param array $data
     * @return PropertyImage
     */
    public function storeImage(Property $property, UploadedFile $file, array $data = []): PropertyImage
    {
        $path = $file->store('properties/' . $property->id, 'public');

        return DB::transaction(function () use ($property, $path, $data) {
            $isCover = $data['is_cover'] ?? false;

            if ($isCover) {
                $property->images()->update(['is_cover' => false]);
            }

            // If no images exist, make this the cover
            if ($property->images()->count() === 0) {
                $isCover = true;
            }

            return $property->images()->create([
                'path' => $path,
                'is_cover' => $isCover,
                'order' => $data['order'] ?? $property->images()->max('order') + 1,
                'description' => $data['description'] ?? null,
            ]);
        });
    }

    /**
     * Delete an image and its physical file.
     *
     * @param PropertyImage $image
     * @return bool
     */
    public function deleteImage(PropertyImage $image): bool
    {
        Storage::disk('public')->delete($image->path);

        return DB::transaction(function () use ($image) {
            $wasCover = $image->is_cover;
            $propertyId = $image->property_id;

            $deleted = $image->delete();

            if ($wasCover && $deleted) {
                $nextImage = PropertyImage::where('property_id', $propertyId)->orderBy('order')->first();
                if ($nextImage) {
                    $nextImage->update(['is_cover' => true]);
                }
            }

            return $deleted;
        });
    }

    /**
     * Set an image as the cover for its property.
     *
     * @param PropertyImage $image
     * @return bool
     */
    public function setAsCover(PropertyImage $image): bool
    {
        return DB::transaction(function () use ($image) {
            PropertyImage::where('property_id', $image->property_id)->update(['is_cover' => false]);
            return $image->update(['is_cover' => true]);
        });
    }

    /**
     * Reorder images for a property.
     *
     * @param array $orderMap Array of [image_id => order]
     * @return void
     */
    public function reorderImages(array $orderMap): void
    {
        DB::transaction(function () use ($orderMap) {
            foreach ($orderMap as $id => $order) {
                PropertyImage::where('id', $id)->update(['order' => $order]);
            }
        });
    }
}
