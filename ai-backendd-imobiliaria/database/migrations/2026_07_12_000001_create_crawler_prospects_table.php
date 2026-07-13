<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('crawler.prospects');

        Schema::create('crawler.prospects', function (Blueprint $table) {
            $table->id();
            $table->string('root_domain')->unique();
            $table->string('source_name');
            $table->text('base_url')->nullable();
            $table->string('google_place_id');
            $table->string('name');
            $table->string('city');
            $table->string('state');
            $table->string('status');
            $table->string('reject_reason')->nullable();
            $table->string('phone')->nullable();
            $table->text('address')->nullable();
            $table->jsonb('place_payload')->nullable();
            $table->string('prospecting_run_id')->nullable();
            $table->timestamps();

            $table->index('root_domain');
            $table->index('status');
            $table->index('prospecting_run_id');
            $table->index(['city', 'state']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crawler.prospects');
    }
};
