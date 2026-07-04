<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('property_valuations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agency_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('code')->unique();
            $table->string('status');
            $table->string('city');
            $table->string('neighborhood');
            $table->string('residential_type');
            $table->decimal('area', 10, 2);
            $table->unsignedTinyInteger('bedrooms');
            $table->unsignedTinyInteger('bathrooms');
            $table->unsignedTinyInteger('garage_spaces');
            $table->boolean('flood_risk')->default(false);
            $table->decimal('base_min_value', 18, 2)->nullable();
            $table->decimal('base_central_value', 18, 2)->nullable();
            $table->decimal('base_max_value', 18, 2)->nullable();
            $table->decimal('final_min_value', 18, 2)->nullable();
            $table->decimal('final_central_value', 18, 2)->nullable();
            $table->decimal('final_max_value', 18, 2)->nullable();
            $table->unsignedTinyInteger('flood_adjustment_percent')->nullable();
            $table->json('sample_summary')->nullable();
            $table->json('comparable_evidence')->nullable();
            $table->timestamps();

            $table->index(['agency_id', 'created_at']);
            $table->index(['agency_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('property_valuations');
    }
};
