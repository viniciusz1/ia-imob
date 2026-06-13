<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ScrapyProperty>
 */
class ScrapyPropertyFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tipo' => 'Casa',
            'imobiliaria' => 'EC Corretores',
            'valor' => 855000,
            'bairro' => 'vila baependi',
            'cidade' => 'jaragua do sul',
            'imagem' => 'https://imgs1.cdn-imobibrasil.com.br/imagens/imoveis/thumb15-202303021…',
            'link_imovel' => 'https://www.eccorretoresdeimoveis.com.br/imovel/2729780/casa-venda-jar…',
            'descricao' => 'Casa em vila baependi',
            'quartos' => rand(1, 4),
            'banheiros' => rand(1, 4),
            'vagas' => rand(0, 3),
            'area' => rand(50, 300),
        ];
    }
}
