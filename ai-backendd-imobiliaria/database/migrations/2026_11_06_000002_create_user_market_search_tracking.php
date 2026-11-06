<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->unsignedInteger('market_search_daily_limit')->default(20);
        });

        Schema::create('user_market_search_daily_usage', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('usage_date');
            $table->unsignedInteger('used_count')->default(0);
            $table->timestamps();
            $table->unique(['user_id', 'usage_date']);
        });

        Schema::create('market_search_history', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('agency_id')->constrained()->cascadeOnDelete();
            $table->string('mode');
            $table->json('query');
            $table->timestamp('created_at')->useCurrent();
            $table->index(['user_id', 'created_at']);
            $table->index(['agency_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('market_search_history');
        Schema::dropIfExists('user_market_search_daily_usage');
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('market_search_daily_limit');
        });
    }
};
