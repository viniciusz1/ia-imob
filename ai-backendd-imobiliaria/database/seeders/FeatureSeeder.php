<?php

namespace Database\Seeders;

use App\Models\Feature;
use Illuminate\Database\Seeder;

class FeatureSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $features = [
            'Piscina',
            'Churrasqueira',
            'Academia',
            'Ar Condicionado',
            'Elevador',
            'Portaria 24h',
            'Salão de Festas',
            'Playground',
            'Varanda Gourmet',
            'Mobiliado',
            'Garagem',
            'Jardim',
            'Pet Friendly',
        ];

        foreach ($features as $feature) {
            Feature::updateOrCreate(['name' => $feature], ['name' => $feature]);
        }
    }
}
