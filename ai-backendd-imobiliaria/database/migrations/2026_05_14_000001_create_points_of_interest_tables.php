<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('points_of_interest', function (Blueprint $table) {
            $table->id();
            $table->string('osm_type', 16);
            $table->unsignedBigInteger('osm_id');
            $table->string('name');
            $table->string('category', 64);
            $table->string('subcategory', 64)->nullable();
            $table->string('city');
            $table->string('state', 2);
            $table->decimal('lat', 10, 7);
            $table->decimal('lng', 10, 7);
            $table->json('aliases')->nullable();
            $table->json('raw_tags')->nullable();
            $table->timestamp('imported_at')->nullable();
            $table->timestamps();

            $table->unique(['osm_type', 'osm_id']);
            $table->index(['city', 'state']);
            $table->index(['city', 'category']);
            $table->index('name');
        });

        Schema::create('neighborhood_reference_points', function (Blueprint $table) {
            $table->id();
            $table->string('osm_type', 16)->nullable();
            $table->unsignedBigInteger('osm_id')->nullable();
            $table->string('name');
            $table->string('city');
            $table->string('state', 2);
            $table->decimal('lat', 10, 7);
            $table->decimal('lng', 10, 7);
            $table->json('aliases')->nullable();
            $table->json('raw_tags')->nullable();
            $table->timestamp('imported_at')->nullable();
            $table->timestamps();

            $table->unique(['name', 'city', 'state']);
            $table->index(['city', 'state']);
            $table->index('name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('neighborhood_reference_points');
        Schema::dropIfExists('points_of_interest');
    }
};
