<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SiteSettingsResource;
use App\Models\TenantSiteSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Public Branding for a White-Label Site. The Tenant is resolved/bound by
 * ResolvePublicTenant; falls back to model-default Branding when the Tenant
 * has not configured its settings yet.
 */
class PublicSiteController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $tenant = $request->attributes->get('tenant');

        $settings = $tenant->siteSettings ?? new TenantSiteSettings();

        $branding = (new SiteSettingsResource($settings))->toArray($request);

        return response()->json([
            'data' => array_merge([
                'name' => $tenant->name,
                'slug' => $tenant->slug,
            ], $branding),
        ]);
    }
}
