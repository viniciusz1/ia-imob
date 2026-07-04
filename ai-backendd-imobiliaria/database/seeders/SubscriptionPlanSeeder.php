<?php

namespace Database\Seeders;

use App\Enums\AsaasCycle;
use App\Models\SubscriptionPlan;
use Illuminate\Database\Seeder;

class SubscriptionPlanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $plans = [
            [
                'name' => 'Plano Mensal',
                'slug' => 'monthly',
                'asaas_cycle' => AsaasCycle::Monthly->value,
                'price_per_month' => 299.00,
                'total_price' => 299.00,
                'description' => 'Acesso completo, cobrança mensal.',
            ],
            [
                'name' => 'Plano Semestral',
                'slug' => 'semiannual',
                'asaas_cycle' => AsaasCycle::Semiannually->value,
                'price_per_month' => 249.00,
                'total_price' => 1494.00, // 249 * 6
                'description' => 'Acesso completo, economize pagando por semestre.',
            ],
            [
                'name' => 'Plano Anual',
                'slug' => 'annual',
                'asaas_cycle' => AsaasCycle::Yearly->value,
                'price_per_month' => 199.00,
                'total_price' => 2388.00, // 199 * 12
                'description' => 'Acesso completo, o maior desconto com cobrança anual.',
            ],
        ];

        foreach ($plans as $plan) {
            SubscriptionPlan::updateOrCreate(
                ['slug' => $plan['slug']],
                $plan
            );
        }
    }
}
