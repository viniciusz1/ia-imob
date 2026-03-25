<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenant_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('plan_id')->constrained('subscription_plans');
            $table->string('asaas_customer_id', 50)->nullable();
            $table->string('asaas_subscription_id', 50)->nullable();
            $table->string('billing_type', 20); // BOLETO | CREDIT_CARD | PIX
            $table->string('status', 20)->default('pending'); // pending|active|inactive|expired|cancelled
            $table->date('next_due_date')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();

            // A user can have at most one active/pending subscription at a time
            // Enforced at application level by SubscriptionService
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_subscriptions');
    }
};
