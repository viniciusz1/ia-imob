<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('property_valuations', function (Blueprint $table) {
            $table->json('city_json')->nullable()->after('neighborhood');
            $table->json('neighborhood_json')->nullable()->after('city_json');
        });

        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            DB::statement('UPDATE property_valuations SET city_json = json_array(city), neighborhood_json = json_array(neighborhood)');
        } elseif ($driver === 'pgsql') {
            DB::statement('UPDATE property_valuations SET city_json = to_jsonb(city), neighborhood_json = to_jsonb(neighborhood)');
        } else {
            DB::statement('UPDATE property_valuations SET city_json = json_array(city), neighborhood_json = json_array(neighborhood)');
        }

        Schema::table('property_valuations', function (Blueprint $table) {
            $table->dropColumn(['city', 'neighborhood']);
        });

        Schema::table('property_valuations', function (Blueprint $table) {
            $table->renameColumn('city_json', 'city');
            $table->renameColumn('neighborhood_json', 'neighborhood');
        });
    }

    public function down(): void
    {
        Schema::table('property_valuations', function (Blueprint $table) {
            $table->string('city_string')->nullable()->after('neighborhood');
            $table->string('neighborhood_string')->nullable()->after('city_string');
        });

        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            DB::statement("UPDATE property_valuations SET city_string = json_extract(city, '$[0]'), neighborhood_string = json_extract(neighborhood, '$[0]')");
        } elseif ($driver === 'pgsql') {
            DB::statement('UPDATE property_valuations SET city_string = city->>0, neighborhood_string = neighborhood->>0');
        } else {
            DB::statement("UPDATE property_valuations SET city_string = json_unquote(json_extract(city, '$[0]')), neighborhood_string = json_unquote(json_extract(neighborhood, '$[0]'))");
        }

        Schema::table('property_valuations', function (Blueprint $table) {
            $table->dropColumn(['city', 'neighborhood']);
        });

        Schema::table('property_valuations', function (Blueprint $table) {
            $table->renameColumn('city_string', 'city');
            $table->renameColumn('neighborhood_string', 'neighborhood');
        });
    }
};
