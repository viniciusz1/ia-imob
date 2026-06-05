<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\PublicLeadRequest;
use App\Models\Lead;
use App\Models\Property;
use App\Notifications\LeadReceived;
use Illuminate\Http\JsonResponse;

/**
 * Captures a Final Client's interest as a tenant-scoped Lead and notifies the
 * listing Broker. The Tenant is resolved/bound by ResolvePublicTenant, so the
 * global TenantScope both limits the property lookup and stamps the Lead.
 */
class PublicLeadController extends Controller
{
    public function store(PublicLeadRequest $request): JsonResponse
    {
        $data = $request->validated();

        $property = null;
        if (! empty($data['property'])) {
            $property = Property::query()
                ->where('is_published', true)
                ->where(fn ($q) => $q
                    ->where('slug', $data['property'])
                    ->orWhere('reference_code', $data['property']))
                ->first();
        }

        $lead = Lead::create([
            'property_id' => $property?->id,
            'name' => $data['name'],
            'phone' => $data['phone'],
            'email' => $data['email'] ?? null,
            'message' => $data['message'] ?? null,
            'source' => $data['source'] ?? 'site',
            'status' => 'new',
        ]);

        $property?->broker?->notify(new LeadReceived($lead));

        return response()->json([
            'data' => ['status' => 'received'],
        ], 201);
    }
}
