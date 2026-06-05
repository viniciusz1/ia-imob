<?php

namespace Database\Seeders;

use App\Models\ScrapyProperty;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class ScrapyPropertySeeder extends Seeder
{
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

            $area = 0;
            if (str_contains(strtolower($tipo), 'apartamento')) {
                $area = 45 + ($seed % 100);
            } else if (str_contains(strtolower($tipo), 'casa') || str_contains(strtolower($tipo), 'chacara')) {
                $area = 80 + ($seed % 220);
            } else if (str_contains(strtolower($tipo), 'sala') || str_contains(strtolower($tipo), 'comercial')) {
                $area = 30 + ($seed % 150);
            } else if (str_contains(strtolower($tipo), 'terreno')) {
                $area = 200 + ($seed % 800);
            } else {
                $area = 50 + ($seed % 150);
            }

            $suites = $quartos > 1 ? (int) floor($quartos / 2) : ($seed % 3 === 0 ? 1 : 0);
            $banheiros = max($quartos - 1, 0) + ($seed % 3);
            $vagas = ($seed % 3);

            $comodidades = [
                'piscina' => $seed % 7 === 0,
                'churrasqueira' => $seed % 5 === 0,
                'academia' => $seed % 9 === 0,
                'salao_festas' => $seed % 8 === 0,
                'playground' => $seed % 11 === 0,
                'sacada' => str_contains(strtolower($tipo), 'apartamento') && $seed % 3 !== 0,
                'mobiliado' => $seed % 13 === 0,
                'ar_condicionado' => $seed % 6 === 0,
                'lavanderia' => $seed % 10 === 0,
                'escritorio' => $seed % 14 === 0,
                'closet' => $seed % 15 === 0,
                'elevador' => str_contains(strtolower($tipo), 'apartamento') && $seed % 4 !== 0,
                'portaria_24h' => str_contains(strtolower($tipo), 'apartamento') && $seed % 3 === 0,
                'aceita_permuta' => $seed % 12 === 0,
                'financiamento' => $seed % 4 === 0,
            ];

            // Sanitize values from scraper — clamp absurdly large numbers
            $valor = $item['valor'] ?? null;
            if ($valor !== null) {
                $valor = (float) $valor;
                // Clamp unrealistically large values (> 1 trilhão = 1e12)
                if ($valor > 1_000_000_000_000) {
                    $valor = 0;
                }
            }

            ScrapyProperty::create([
                'tipo' => $item['tipo'] ?? null,
                'imobiliaria' => $item['imobiliaria'] ?? null,
                'valor' => $valor,
                'bairro' => $item['bairro'] ?? null,
                'cidade' => $item['cidade'] ?? null,
                'imagem' => $item['imagem'] ?? null,
                'link_imovel' => $item['link_imovel'] ?? null,
                'descricao' => $item['descricao'] ?? null,
                'quartos' => $quartos,
                'suites' => $suites,
                'banheiros' => $banheiros,
                'vagas' => $vagas,
                'area' => $area,
                ...$comodidades,
            ]);
        }
    }
}
