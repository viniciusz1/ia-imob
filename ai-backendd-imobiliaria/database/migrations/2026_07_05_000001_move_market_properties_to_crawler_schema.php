<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE SCHEMA IF NOT EXISTS crawler');

        Schema::dropIfExists('crawler.market_properties');
        Schema::dropIfExists('market_properties');

        Schema::create('crawler.market_properties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crawler_run_id')->constrained('public.crawler_runs')->cascadeOnDelete();
            $table->foreignId('raw_property_id')->nullable()->constrained('crawler.raw_properties')->nullOnDelete();
            $table->text('source_url')->nullable();
            $table->string('tipo')->nullable();
            $table->string('imobiliaria')->nullable();
            $table->decimal('valor', 18, 2)->nullable();
            $table->string('bairro')->nullable();
            $table->string('cidade')->nullable();
            $table->text('imagem')->nullable();
            $table->text('link_imovel')->nullable();
            $table->text('descricao')->nullable();
            $table->integer('quartos')->nullable();
            $table->integer('suites')->nullable();
            $table->integer('banheiros')->nullable();
            $table->integer('vagas')->nullable();
            $table->decimal('area', 10, 2)->nullable();
            $table->boolean('aceita_permuta')->nullable();
            $table->boolean('financiamento')->nullable();
            $table->boolean('piscina')->nullable();
            $table->boolean('churrasqueira')->nullable();
            $table->boolean('academia')->nullable();
            $table->boolean('salao_festas')->nullable();
            $table->boolean('playground')->nullable();
            $table->boolean('sacada')->nullable();
            $table->boolean('mobiliado')->nullable();
            $table->boolean('ar_condicionado')->nullable();
            $table->boolean('lavanderia')->nullable();
            $table->boolean('escritorio')->nullable();
            $table->boolean('closet')->nullable();
            $table->boolean('elevador')->nullable();
            $table->boolean('portaria_24h')->nullable();
            $table->string('andar')->nullable();
            $table->string('posicao_solar')->nullable();
            $table->integer('ano_construcao')->nullable();
            $table->string('quality_status')->nullable();
            $table->jsonb('quality_metadata')->nullable();
            $table->timestamps();

            $table->index('quartos');
            $table->index('bairro');
            $table->index('cidade');
            $table->index('tipo');
            $table->index('valor');
            $table->index('imobiliaria');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crawler.market_properties');

        Schema::create('market_properties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crawler_run_id')->constrained('crawler_runs')->cascadeOnDelete();
            $table->string('tipo')->nullable();
            $table->string('imobiliaria')->nullable();
            $table->decimal('valor', 18, 2)->nullable();
            $table->string('bairro')->nullable();
            $table->string('cidade')->nullable();
            $table->text('imagem')->nullable();
            $table->text('link_imovel')->nullable();
            $table->text('descricao')->nullable();
            $table->integer('quartos')->nullable();
            $table->integer('suites')->nullable();
            $table->integer('banheiros')->nullable();
            $table->integer('vagas')->nullable();
            $table->decimal('area', 10, 2)->nullable();
            $table->boolean('aceita_permuta')->nullable();
            $table->boolean('financiamento')->nullable();
            $table->boolean('piscina')->nullable();
            $table->boolean('churrasqueira')->nullable();
            $table->boolean('academia')->nullable();
            $table->boolean('salao_festas')->nullable();
            $table->boolean('playground')->nullable();
            $table->boolean('sacada')->nullable();
            $table->boolean('mobiliado')->nullable();
            $table->boolean('ar_condicionado')->nullable();
            $table->boolean('lavanderia')->nullable();
            $table->boolean('escritorio')->nullable();
            $table->boolean('closet')->nullable();
            $table->boolean('elevador')->nullable();
            $table->boolean('portaria_24h')->nullable();
            $table->string('andar')->nullable();
            $table->string('posicao_solar')->nullable();
            $table->integer('ano_construcao')->nullable();
            $table->timestamps();
        });
    }
};
