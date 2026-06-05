<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicPropertyDetailResource;
use App\Http\Resources\PublicPropertyResource;
use App\Models\Property;
use App\Services\PropertyService;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * Read-only public API for a White-Label Site. The Tenant is already resolved
 * and bound by ResolvePublicTenant, so the global TenantScope limits every
 * query to that Tenant; here we additionally force is_published = true.
 */
class PublicPropertyController extends Controller
{
    private const ALLOWED_SORTS = ['created_at', 'sale_price', 'rent_price', 'usable_area'];

    public function __construct(private PropertyService $properties) {}

    public function index(Request $request)
    {
        $filters = $request->only([
            'purpose', 'property_type', 'city', 'neighborhood', 'search', 'reference_code',
            'min_price', 'max_price', 'min_area', 'max_area', 'bedrooms', 'suites',
            'bathrooms', 'garage_spaces', 'features', 'is_highlighted', 'order_by', 'direction', 'per_page',
        ]);

        // Public sites only ever see published inventory of the resolved Tenant.
        $filters['is_published'] = true;

        // Whitelist sort to avoid arbitrary column ordering from query params.
        if (! in_array($filters['order_by'] ?? null, self::ALLOWED_SORTS, true)) {
            unset($filters['order_by']);
        }
        $filters['direction'] = ($filters['direction'] ?? 'desc') === 'asc' ? 'asc' : 'desc';

        $paginator = $this->properties->listProperties($filters);
        $this->ensurePublicSlugs($paginator);

        return PublicPropertyResource::collection($paginator);
    }

    private function ensurePublicSlugs(LengthAwarePaginator $paginator): void
    {
        $paginator->getCollection()->each(function (Property $property): void {
            if (! Property::isInvalidPropertySlug($property->slug)) {
                return;
            }

            $property->slug = Property::buildUniquePropertySlug($property);
            $property->saveQuietly();
        });
    }

    public function show(string $slug)
    {
        $property = Property::query()
            ->where('slug', $slug)
            ->where('is_published', true)
            ->with(['images', 'features:id,name', 'broker'])
            ->firstOrFail();

        return new PublicPropertyDetailResource($property);
    }
}
