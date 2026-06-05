<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * A Tenant's Branding for both the CRM settings page and the public site.
 */
class SiteSettingsResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'theme_slug' => $this->theme_slug,
            'logo' => $this->asset($this->logo_path),
            'favicon' => $this->asset($this->favicon_path),
            'palette' => [
                'primary' => $this->color_primary,
                'secondary' => $this->color_secondary,
                'accent' => $this->color_accent,
                'bg' => $this->color_bg,
                'surface' => $this->color_surface,
                'text' => $this->color_text,
                'muted' => $this->color_muted,
            ],
            'contact' => [
                'whatsapp' => $this->default_whatsapp,
                'facebook' => $this->facebook_url,
                'instagram' => $this->instagram_url,
            ],
            'analytics' => [
                'google_analytics_id' => $this->google_analytics_id,
                'meta_pixel_id' => $this->meta_pixel_id,
            ],
            'content' => [
                'hero_title' => $this->hero_title,
                'hero_subtitle' => $this->hero_subtitle,
                'about_text' => $this->about_text,
            ],
        ];
    }

    private function asset(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        return filter_var($path, FILTER_VALIDATE_URL) ? $path : Storage::disk('public')->url($path);
    }
}
