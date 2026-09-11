<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('auction_properties', function (Blueprint $table) {
            $table->id();
            $table->string('property_key')->unique()->comment('Stable identifier representing the physical property');
            $table->string('property_type')->default('unknown'); // house, apartment, land, commercial, rural
            
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            
            $table->string('address')->nullable();
            $table->string('neighborhood')->nullable();
            $table->string('city')->nullable();
            $table->string('state', 2)->nullable();
            $table->string('postal_code')->nullable();
            
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            
            $table->decimal('built_area_m2', 12, 2)->nullable();
            $table->decimal('land_area_m2', 12, 2)->nullable();
            
            $table->string('occupancy_status')->default('unknown'); // vacant, occupied, unknown
            $table->string('registration_number')->nullable();
            
            $table->jsonb('source_payload')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auction_properties');
    }
};
