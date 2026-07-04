<?php

namespace Database\Seeders;

use App\Models\SystemEnum;
use Illuminate\Database\Seeder;

class SystemEnumSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $enums = [
            [
                'tag' => 'property_types',
                'data' => [
                    ['value' => 'apartamento', 'label' => 'Apartamento'],
                    ['value' => 'casa', 'label' => 'Casa'],
                    ['value' => 'sobrado', 'label' => 'Sobrado'],
                    ['value' => 'terreno', 'label' => 'Terreno'],
                    ['value' => 'comercial', 'label' => 'Comercial'],
                    ['value' => 'rural', 'label' => 'Rural'],
                ],
            ],
            [
                'tag' => 'property_purposes',
                'data' => [
                    ['value' => 'venda', 'label' => 'Venda'],
                    ['value' => 'locacao', 'label' => 'Locação'],
                    ['value' => 'venda_locacao', 'label' => 'Venda e Locação'],
                ],
            ],
            [
                'tag' => 'property_statuses',
                'data' => [
                    ['value' => 'disponivel', 'label' => 'Disponível'],
                    ['value' => 'reservado', 'label' => 'Reservado'],
                    ['value' => 'vendido', 'label' => 'Vendido'],
                    ['value' => 'locado', 'label' => 'Locado'],
                    ['value' => 'inativo', 'label' => 'Inativo'],
                ],
            ],
        ];

        foreach ($enums as $enum) {
            SystemEnum::updateOrCreate(['tag' => $enum['tag']], $enum);
        }
    }
}
