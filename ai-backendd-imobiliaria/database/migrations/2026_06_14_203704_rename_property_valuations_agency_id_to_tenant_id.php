<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('property_valuations', 'agency_id')) {
            return;
        }

        Schema::table('property_valuations', function (Blueprint $table) {
            $table->dropForeign(['agency_id']);
            $table->dropIndex(['agency_id', 'created_at']);
            $table->dropIndex(['agency_id', 'status']);
            $table->renameColumn('agency_id', 'tenant_id');
        });

        Schema::table('property_valuations', function (Blueprint $table) {
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->index(['tenant_id', 'created_at']);
            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('property_valuations', 'tenant_id')) {
            return;
        }

        Schema::table('property_valuations', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropIndex(['tenant_id', 'created_at']);
            $table->dropIndex(['tenant_id', 'status']);
            $table->renameColumn('tenant_id', 'agency_id');
        });

        Schema::table('property_valuations', function (Blueprint $table) {
            $table->foreign('agency_id')->references('id')->on('agencies')->cascadeOnDelete();
            $table->index(['agency_id', 'created_at']);
            $table->index(['agency_id', 'status']);
        });
    }
};
