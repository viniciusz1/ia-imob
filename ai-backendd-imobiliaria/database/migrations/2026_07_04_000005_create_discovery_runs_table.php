<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('discovery_runs', function (Blueprint $table) {
            $table->id();
            $table->string('source_name');
            $table->foreignId('crawler_run_id')->nullable()->constrained('crawler_runs')->nullOnDelete();
            $table->jsonb('urls')->nullable();
            $table->string('status')->default('running');
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('completed_at')->nullable();
            $table->text('error_message')->nullable();
            $table->boolean('latest')->default(false);
            $table->timestamps();

            $table->index('source_name');
            $table->index('status');
            $table->index(['source_name', 'latest']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('discovery_runs');
    }
};
