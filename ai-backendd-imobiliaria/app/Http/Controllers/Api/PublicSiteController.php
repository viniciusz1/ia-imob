<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SiteSettingsResource;
use App\Models\AgencySiteSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Public Branding for a White-Label Site. The Agency is resolved/bound by
 * ResolvePublicAgency; falls back to model-default Branding when the Agency
 * has not configured its settings yet.
 */
class PublicSiteController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $agency = $request->attributes->get('agency');

        $settings = $agency->siteSettings ?? new AgencySiteSettings;

        $branding = (new SiteSettingsResource($settings))->toArray($request);

        return response()->json([
            'data' => array_merge([
                'name' => $agency->name,
                'slug' => $agency->slug,
            ], $branding),
        ]);
    }
}
