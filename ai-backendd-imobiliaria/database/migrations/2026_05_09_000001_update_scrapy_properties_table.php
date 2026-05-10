<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scrapy-properties', function (Blueprint $table) {
            $table->renameColumn('qtd_quartos', 'quartos');
            $table->renameColumn('area_m2', 'area');
        });

        Schema::table('scrapy-properties', function (Blueprint $table) {
            $table->integer('suites')->nullable()->after('quartos');
            $table->integer('banheiros')->nullable()->after('suites');
            $table->integer('vagas')->nullable()->after('banheiros');
            $table->boolean('aceita_permuta')->nullable()->after('area');
            $table->boolean('financiamento')->nullable()->after('aceita_permuta');
            $table->boolean('piscina')->nullable()->after('financiamento');
            $table->boolean('churrasqueira')->nullable()->after('piscina');
            $table->boolean('academia')->nullable()->after('churrasqueira');
            $table->boolean('salao_festas')->nullable()->after('academia');
            $table->boolean('playground')->nullable()->after('salao_festas');
            $table->boolean('sacada')->nullable()->after('playground');
            $table->boolean('mobiliado')->nullable()->after('sacada');
            $table->boolean('ar_condicionado')->nullable()->after('mobiliado');
            $table->boolean('lavanderia')->nullable()->after('ar_condicionado');
            $table->boolean('escritorio')->nullable()->after('lavanderia');
            $table->boolean('closet')->nullable()->after('escritorio');
            $table->boolean('elevador')->nullable()->after('closet');
            $table->boolean('portaria_24h')->nullable()->after('elevador');
            $table->string('andar')->nullable()->after('portaria_24h');
            $table->string('posicao_solar')->nullable()->after('andar');
            $table->integer('ano_construcao')->nullable()->after('posicao_solar');
        });
    }

    public function down(): void
    {
        Schema::table('scrapy-properties', function (Blueprint $table) {
            $table->dropColumn([
                'suites', 'banheiros', 'vagas',
                'aceita_permuta', 'financiamento',
                'piscina', 'churrasqueira', 'academia', 'salao_festas',
                'playground', 'sacada', 'mobiliado', 'ar_condicionado',
                'lavanderia', 'escritorio', 'closet', 'elevador', 'portaria_24h',
                'andar', 'posicao_solar', 'ano_construcao',
            ]);
        });

        Schema::table('scrapy-properties', function (Blueprint $table) {
            $table->renameColumn('quartos', 'qtd_quartos');
            $table->renameColumn('area', 'area_m2');
        });
    }
};
