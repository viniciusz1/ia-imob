<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantSiteSettings extends Model
{
    /**
     * Defaults applied at the model level so an unsaved instance (public site
     * with no settings row yet) and a freshly-created row both expose a full
     * palette without a DB round-trip.
     */
    protected $attributes = [
        'theme_slug' => 'classic',
        'color_primary' => '#1e3a8a',
        'color_secondary' => '#0ea5e9',
        'color_accent' => '#f59e0b',
        'color_bg' => '#ffffff',
        'color_surface' => '#f8fafc',
        'color_text' => '#0f172a',
        'color_muted' => '#64748b',
    ];

    protected $fillable = [
        'tenant_id',
        'theme_slug',
        'logo_path',
        'favicon_path',
        'color_primary',
        'color_secondary',
        'color_accent',
        'color_bg',
        'color_surface',
        'color_text',
        'color_muted',
        'default_whatsapp',
        'facebook_url',
        'instagram_url',
        'google_analytics_id',
        'meta_pixel_id',
        'hero_title',
        'hero_subtitle',
        'about_text',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
