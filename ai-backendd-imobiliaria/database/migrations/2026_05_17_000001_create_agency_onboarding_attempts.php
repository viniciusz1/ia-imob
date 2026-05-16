<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agency_onboarding_attempts', function (Blueprint $table) {
            $table->id();
            $table->string('agency_type', 16);
            $table->unsignedBigInteger('agency_id')->nullable();
            $table->text('submitted_url');
            $table->string('derived_domain')->nullable();
            $table->string('outcome', 32);
            $table->jsonb('report');
            $table->integer('duration_ms')->nullable();
            $table->integer('llm_rounds')->nullable();
            $table->string('submitted_by')->nullable();
            $table->timestamps();

            $table->index(['agency_type', 'agency_id']);
            $table->index('outcome');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agency_onboarding_attempts');
    }
};
