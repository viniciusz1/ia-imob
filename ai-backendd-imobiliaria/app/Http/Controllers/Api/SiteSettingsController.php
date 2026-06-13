<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SiteSettingsResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * CRM-side Branding management for the authenticated user's own Tenant.
 */
class SiteSettingsController extends Controller
{
    private const COLOR_RULE = ['sometimes', 'string', 'regex:/^#([0-9a-fA-F]{3,8})$/'];

    public function show(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        abort_if($tenant === null, 422, 'User is not associated with a tenant.');

        $settings = $tenant->siteSettings ?? $tenant->siteSettings()->create([]);

        return (new SiteSettingsResource($settings))->response()->setStatusCode(200);
    }

    public function update(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        abort_if($tenant === null, 422, 'User is not associated with a tenant.');

        $validated = $request->validate([
            'theme_slug' => ['sometimes', 'string', 'max:50'],
            'logo_path' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'favicon_path' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'color_primary' => self::COLOR_RULE,
            'color_secondary' => self::COLOR_RULE,
            'color_accent' => self::COLOR_RULE,
            'color_bg' => self::COLOR_RULE,
            'color_surface' => self::COLOR_RULE,
            'color_text' => self::COLOR_RULE,
            'color_muted' => self::COLOR_RULE,
            'default_whatsapp' => ['sometimes', 'nullable', 'string', 'max:30'],
            'facebook_url' => ['sometimes', 'nullable', 'url', 'max:255'],
            'instagram_url' => ['sometimes', 'nullable', 'url', 'max:255'],
            'google_analytics_id' => ['sometimes', 'nullable', 'string', 'max:50'],
            'meta_pixel_id' => ['sometimes', 'nullable', 'string', 'max:50'],
            'hero_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'hero_subtitle' => ['sometimes', 'nullable', 'string', 'max:255'],
            'about_text' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ]);

        $settings = $tenant->siteSettings()->updateOrCreate([], $validated);

        return (new SiteSettingsResource($settings))->response()->setStatusCode(200);
    }
}
