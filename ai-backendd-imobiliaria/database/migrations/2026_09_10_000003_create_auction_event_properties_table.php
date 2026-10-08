<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('auction_event_properties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('auction_event_id')->constrained('auction_events')->cascadeOnDelete();
            $table->foreignId('auction_property_id')->constrained('auction_properties')->cascadeOnDelete();
            $table->foreignId('listing_identity_id')->nullable()->constrained('crawler.listing_identities')->nullOnDelete();
            
            $table->string('lot_number')->nullable();
            $table->string('canonical_url', 1024)->nullable();
            $table->string('inventory_state')->default('published');
            
            // Note: current_round_id would be a circular dependency if defined as constrained right now,
            // so we will define it as unsignedBigInteger and add foreign key later or just leave it unconstrained at DB level.
            $table->unsignedBigInteger('current_round_id')->nullable();
            
            $table->timestampTz('observed_at')->nullable();
            $table->timestamps();

            $table->unique(['auction_event_id', 'lot_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auction_event_properties');
    }
};
