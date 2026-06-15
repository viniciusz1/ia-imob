<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agency_extractor_refinements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('agency_type');
            $table->unsignedBigInteger('agency_id');
            $table->string('field_name');
            $table->foreignId('agency_onboarding_attempt_id')->nullable()->constrained('agency_onboarding_attempts')->nullOnDelete();
            $table->json('before')->nullable();
            $table->json('after')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['agency_type', 'agency_id']);
            $table->index(['agency_type', 'agency_id', 'field_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agency_extractor_refinements');
    }
};
