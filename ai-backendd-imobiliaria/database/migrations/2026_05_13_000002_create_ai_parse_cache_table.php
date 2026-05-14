<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_parse_cache', function (Blueprint $table) {
            $table->id();
            $table->string('cache_key')->index();
            $table->text('prompt');
            $table->string('context_city')->nullable();
            $table->jsonb('filters');
            $table->string('schema_version');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('cache_hit')->default(false);
            $table->timestamps();

            $table->index(['cache_key', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_parse_cache');
    }
};
