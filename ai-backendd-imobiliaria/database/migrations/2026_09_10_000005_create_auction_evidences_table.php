<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('auction_evidences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('auction_event_property_id')->constrained('auction_event_properties')->cascadeOnDelete();
            
            $table->string('kind')->default('other'); // detail, notice, registry, photo, other
            $table->string('url', 2048)->nullable();
            $table->string('content_hash')->nullable();
            $table->timestampTz('captured_at')->nullable();
            
            $table->string('artifact_id')->nullable();
            $table->jsonb('metadata')->nullable();
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auction_evidences');
    }
};
