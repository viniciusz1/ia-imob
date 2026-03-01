<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('properties', function (Blueprint $table) {
            $table->id();

            // Basic Info
            $table->string('reference_code')->unique();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('property_type');
            $table->string('purpose');
            $table->string('status');

            // Location
            $table->string('zip_code');
            $table->string('state');
            $table->string('city');
            $table->string('neighborhood');
            $table->string('street');
            $table->string('number');
            $table->string('complement')->nullable();
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->boolean('show_exact_address')->default(false);

            // Pricing
            $table->decimal('sale_price', 15, 2)->nullable();
            $table->decimal('rent_price', 15, 2)->nullable();
            $table->decimal('property_tax', 15, 2)->nullable();
            $table->decimal('condo_fee', 15, 2)->nullable();
            $table->boolean('accepts_financing')->default(false);
            $table->boolean('accepts_exchange')->default(false);
            $table->boolean('show_price')->default(true);

            // Characteristics
            $table->decimal('usable_area', 10, 2)->nullable();
            $table->decimal('total_area', 10, 2)->nullable();
            $table->integer('bedrooms')->default(0);
            $table->integer('suites')->default(0);
            $table->integer('bathrooms')->default(0);
            $table->integer('garage_spaces')->default(0);
            $table->integer('floor_number')->nullable();
            $table->integer('total_floors')->nullable();
            $table->integer('build_year')->nullable();

            // Media
            $table->string('video_url')->nullable();
            $table->string('virtual_tour_url')->nullable();

            // Internal Management
            $table->foreignId('owner_id')->nullable()->constrained('users')->onDelete('set null'); // Assuming owners might be users or a separate client table, but doc says "Reference to Owner, in the client table". If there is no clients table yet, I'll use users or wait. Doc says: "owner_id (foreignId, nullable - Referência ao Proprietário, na tabela de clientes)". 
            $table->foreignId('broker_id')->nullable()->constrained('users')->onDelete('set null');
            $table->text('internal_notes')->nullable();
            $table->boolean('has_exclusive_right')->default(false);
            $table->date('exclusive_right_expiration_date')->nullable();
            $table->string('keys_location')->nullable();

            // Publication
            $table->boolean('is_published')->default(false);
            $table->boolean('is_highlighted')->default(false);

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('properties');
    }
};
