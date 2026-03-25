<?php

namespace Database\Seeders;

use App\Models\ScrapyProperty;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class ScrapyPropertySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $jsonPath = storage_path('app/sitemap.json');
        
        if (!File::exists($jsonPath)) {
            $this->command->warn("JSON file not found at: {$jsonPath}");
            return;
        }

        $json = File::get($jsonPath);
        $data = json_decode($json, true);

        foreach ($data as $index => $item) {
            $tipo = $item['tipo'] ?? '';
            $seed = $index;

            $quartos = 0;
            if (str_contains(strtolower($tipo), 'apartamento') || str_contains(strtolower($tipo), 'casa') || str_contains(strtolower($tipo), 'chacara')) {
                $quartos = ($seed % 4) + 1;
            }

            $areaPrivativa = 0;
            if (str_contains(strtolower($tipo), 'apartamento')) {
                $areaPrivativa = 45 + ($seed % 100);
            } else if (str_contains(strtolower($tipo), 'casa') || str_contains(strtolower($tipo), 'chacara')) {
                $areaPrivativa = 80 + ($seed % 220);
            } else if (str_contains(strtolower($tipo), 'sala') || str_contains(strtolower($tipo), 'comercial')) {
                $areaPrivativa = 30 + ($seed % 150);
            } else if (str_contains(strtolower($tipo), 'terreno')) {
                $areaPrivativa = 200 + ($seed % 800);
            } else {
                $areaPrivativa = 50 + ($seed % 150);
            }

            ScrapyProperty::create([
                'tipo' => $item['tipo'] ?? null,
                'imobiliaria' => $item['imobiliaria'] ?? null,
                'valor' => $item['valor'] ?? null,
                'bairro' => $item['bairro'] ?? null,
                'cidade' => $item['cidade'] ?? null,
                'imagem' => $item['imagem'] ?? null,
                'link_imovel' => $item['link_imovel'] ?? null,
                'descricao' => $item['descricao'] ?? null,
                'qtd_quartos' => $quartos,
                'area_m2' => $areaPrivativa,
            ]);
        }
    }
}
