<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crawler_runs', function (Blueprint $table) {
            $table->id();
            $table->string('source_name');
            $table->string('status')->default('running');
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('completed_at')->nullable();
            $table->text('error_message')->nullable();
            $table->integer('properties_count')->nullable();
            $table->boolean('latest')->default(false);
            $table->timestamps();

            $table->index('source_name');
            $table->index('status');
            $table->index(['source_name', 'latest']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crawler_runs');
    }
};
