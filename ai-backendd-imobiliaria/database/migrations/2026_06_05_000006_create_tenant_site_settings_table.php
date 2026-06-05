<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenant_site_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->unique()->constrained('tenants')->cascadeOnDelete();
            $table->string('theme_slug')->default('classic');

            $table->string('logo_path')->nullable();
            $table->string('favicon_path')->nullable();

            // Semantic color palette (CSS variables on the public site).
            $table->string('color_primary')->default('#1e3a8a');
            $table->string('color_secondary')->default('#0ea5e9');
            $table->string('color_accent')->default('#f59e0b');
            $table->string('color_bg')->default('#ffffff');
            $table->string('color_surface')->default('#f8fafc');
            $table->string('color_text')->default('#0f172a');
            $table->string('color_muted')->default('#64748b');

            $table->string('default_whatsapp')->nullable();
            $table->string('facebook_url')->nullable();
            $table->string('instagram_url')->nullable();
            $table->string('google_analytics_id')->nullable();
            $table->string('meta_pixel_id')->nullable();

            $table->string('hero_title')->nullable();
            $table->string('hero_subtitle')->nullable();
            $table->text('about_text')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_site_settings');
    }
};
