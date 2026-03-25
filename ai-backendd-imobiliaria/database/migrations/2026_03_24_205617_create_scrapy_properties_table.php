<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('scrapy-properties', function (Blueprint $table) {
            $table->id();
            $table->string('tipo')->nullable();
            $table->string('imobiliaria')->nullable();
            $table->decimal('valor', 15, 2)->nullable();
            $table->string('bairro')->nullable();
            $table->string('cidade')->nullable();
            $table->text('imagem')->nullable();
            $table->text('link_imovel')->nullable();
            $table->text('descricao')->nullable();
            $table->integer('qtd_quartos')->nullable();
            $table->decimal('area_m2', 10, 2)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('scrapy-properties');
    }
};
