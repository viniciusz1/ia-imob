<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scrapy-properties', function (Blueprint $table) {
            $table->index('quartos');
            $table->index('bairro');
            $table->index('cidade');
            $table->index('tipo');
            $table->index('valor');
        });
    }

    public function down(): void
    {
        Schema::table('scrapy-properties', function (Blueprint $table) {
            $table->dropIndex(['quartos']);
            $table->dropIndex(['bairro']);
            $table->dropIndex(['cidade']);
            $table->dropIndex(['tipo']);
            $table->dropIndex(['valor']);
        });
    }
};
