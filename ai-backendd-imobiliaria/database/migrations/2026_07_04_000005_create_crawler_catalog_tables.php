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
        Schema::dropIfExists('crawler.raw_properties');
        Schema::dropIfExists('crawler.property_types');
        Schema::dropIfExists('crawler.neighborhoods');
        Schema::dropIfExists('crawler.cities');

        Schema::create('crawler.cities', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug');
            $table->char('state', 2);
            $table->timestamps();
            $table->unique(['slug', 'state']);
        });

        Schema::create('crawler.neighborhoods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('city_id')->constrained('crawler.cities')->cascadeOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->jsonb('aliases')->default('[]');
            $table->timestamps();
            $table->unique(['city_id', 'slug']);
        });

        Schema::create('crawler.property_types', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('slug')->unique();
            $table->jsonb('aliases')->default('[]');
            $table->timestamps();
        });

        Schema::create('crawler.raw_properties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crawler_run_id')->constrained('public.crawler_runs')->cascadeOnDelete();
            $table->text('source_url')->nullable();
            $table->string('external_id')->nullable();
            $table->string('tipo_imovel')->nullable();
            $table->text('imagem')->nullable();
            $table->string('quartos')->nullable();
            $table->string('sala')->nullable();
            $table->string('banheiros')->nullable();
            $table->string('suites')->nullable();
            $table->string('vagas')->nullable();
            $table->string('ano')->nullable();
            $table->string('valor')->nullable();
            $table->string('area_privada')->nullable();
            $table->string('area_util')->nullable();
            $table->text('detalhes')->nullable();
            $table->string('bairro')->nullable();
            $table->string('cidade')->nullable();
            $table->string('piscina')->nullable();
            $table->string('churrasqueira')->nullable();
            $table->string('academia')->nullable();
            $table->string('salao_festas')->nullable();
            $table->string('playground')->nullable();
            $table->string('sacada')->nullable();
            $table->string('mobiliado')->nullable();
            $table->string('ar_condicionado')->nullable();
            $table->string('lavanderia')->nullable();
            $table->string('escritorio')->nullable();
            $table->string('closet')->nullable();
            $table->string('elevador')->nullable();
            $table->string('portaria_24h')->nullable();
            $table->string('aceita_permuta')->nullable();
            $table->string('financiamento')->nullable();
            $table->jsonb('raw_payload')->default('{}');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crawler.raw_properties');
        Schema::dropIfExists('crawler.property_types');
        Schema::dropIfExists('crawler.neighborhoods');
        Schema::dropIfExists('crawler.cities');
    }
};
