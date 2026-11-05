<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('property_valuations', function (Blueprint $table) {
            $table->string('purpose', 10)->default('sale');
        });

        Schema::table('crawler.market_properties', function (Blueprint $table) {
            $table->decimal('valor_aluguel', 15, 2)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('crawler.market_properties', function (Blueprint $table) {
            $table->dropColumn('valor_aluguel');
        });

        Schema::table('property_valuations', function (Blueprint $table) {
            $table->dropColumn('purpose');
        });
    }
};
