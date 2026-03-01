<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();

            // Dados pessoais
            $table->string('name');
            $table->string('email')->unique();
            $table->string('phone');
            $table->string('creci')->nullable();
            $table->integer('order')->default(0);
            $table->text('notes')->nullable();

            // Tipo de pessoa (F = Física, J = Jurídica)
            $table->char('person_type', 1);

            // Relacionamentos (Assumindo que groups e teams serão criados)
            $table->foreignId('group_id')->nullable(); 
            $table->foreignId('team_id')->nullable();

            // Credenciais
            $table->string('username')->unique();
            $table->string('password');
            $table->string('avatar_path')->nullable();
            $table->rememberToken();

            // Status e visibilidade
            $table->boolean('is_active')->default(true);
            $table->boolean('show_on_website')->default(false);
            $table->boolean('has_broker_page')->default(false);

            // Horários de expediente
            $table->time('work_period_1_start')->nullable();
            $table->time('work_period_1_end')->nullable();
            $table->time('work_period_2_start')->nullable();
            $table->time('work_period_2_end')->nullable();

            // Dados para o site
            $table->string('website_name')->nullable();
            $table->string('facebook_link')->nullable();
            $table->string('instagram_link')->nullable();
            $table->text('description')->nullable();

            // Online tracking
            $table->timestamp('last_seen_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Índices para otimização de filtros
            $table->index(['is_active', 'team_id', 'show_on_website']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
