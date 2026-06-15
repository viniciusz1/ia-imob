<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agency_onboarding_evidence', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agency_onboarding_attempt_id')
                ->constrained('agency_onboarding_attempts')
                ->cascadeOnDelete();
            $table->unsignedInteger('sample_index');
            $table->text('url');
            $table->string('content_hash', 64);
            $table->longText('html');
            $table->timestamp('captured_at')->nullable();
            $table->timestamps();

            $table->unique(['agency_onboarding_attempt_id', 'sample_index']);
            $table->index('content_hash');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agency_onboarding_evidence');
    }
};
