<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('auction_rounds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('auction_event_property_id')->constrained('auction_event_properties')->cascadeOnDelete();
            
            $table->integer('round_number')->default(1);
            $table->timestampTz('starts_at')->nullable();
            $table->timestampTz('ends_at')->nullable();
            
            $table->decimal('appraisal_value', 14, 2)->nullable();
            $table->decimal('minimum_bid', 14, 2)->nullable();
            $table->decimal('current_bid', 14, 2)->nullable();
            $table->decimal('commission_rate', 5, 2)->nullable();
            
            $table->string('status')->default('scheduled');
            $table->string('source_label')->nullable();
            $table->jsonb('source_payload')->nullable();
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auction_rounds');
    }
};
