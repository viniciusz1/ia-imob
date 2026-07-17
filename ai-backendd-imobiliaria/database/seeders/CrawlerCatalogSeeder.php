<?php

namespace Database\Seeders;

use App\Models\Crawler\City;
use App\Models\Crawler\Neighborhood;
use App\Models\Crawler\PropertyType;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CrawlerCatalogSeeder extends Seeder
{
    private const CITY = [
        'name' => 'Jaraguá do Sul',
        'slug' => 'jaragua-do-sul',
        'state' => 'SC',
    ];

    private const NEIGHBORHOODS = [
        'Centro',
        'Vila Lenzi',
        'Rau',
        'Boehmerwald',
        'Três Rios do Norte',
        'Três Rios do Sul',
        'Jaraguá 84',
        'Jaraguá Esquerdo',
        'Jaraguá Direito',
        'Novo Horizonte',
        'Santo Antônio',
        'Barra do Rio Molha',
        'Cordeiros',
        'Itaum',
        'Parque Malwee',
        'Água Verde',
        'Bom Retiro',
        'Czerniewicz',
        'Iririú',
        'Parque Guarani',
        'Rio Cerro I',
        'Rio Cerro II',
        'Rio da Luz',
        'Santo Amaro da Imperatriz',
        'Schramm',
        'Tifa Monos',
        'Tifa Martins',
        'Vila Baependi',
        'Vila Lalau',
        'Vila Nova',
        'Vieira',
        'Amizade',
        'Boa Vista',
        'Canela',
        'Costa e Silva',
        'Dona Francisca',
        'Erasmo Schmidt',
        'Fazenda',
        'Guanabara',
        'Ilha da Figueira',
        'João Pessoa',
        'Nereu Ramos',
        'Rio Molha',
        'São Luís',
        'Zarella',
    ];

    private const PROPERTY_TYPES = [
        ['name' => 'Apartamento', 'aliases' => ['apto', 'apart']],
        ['name' => 'Casa', 'aliases' => ['casa residencial']],
        ['name' => 'Casa de Condomínio', 'aliases' => ['casa em condominio', 'casa em condomínio']],
        ['name' => 'Sobrado', 'aliases' => []],
        ['name' => 'Sobrado Geminado', 'aliases' => ['sobrado geminado', 'casa geminada']],
        ['name' => 'Geminado', 'aliases' => ['casa geminado']],
        ['name' => 'Terreno', 'aliases' => ['terreno urbano', 'terreno rural']],
        ['name' => 'Sala Comercial', 'aliases' => ['sala comercial', 'sala']],
        ['name' => 'Galpão', 'aliases' => ['galpao', 'pavilhão', 'pavilhao']],
        ['name' => 'Sítio/Fazenda', 'aliases' => ['sitio', 'fazenda', 'chácara', 'chacara']],
        ['name' => 'Loja', 'aliases' => []],
    ];

    /**
     * Run the crawler catalog seeds.
     */
    public function run(): void
    {
        $city = City::updateOrCreate(
            ['slug' => self::CITY['slug'], 'state' => self::CITY['state']],
            ['name' => self::CITY['name']]
        );

        foreach (self::NEIGHBORHOODS as $neighborhood) {
            Neighborhood::updateOrCreate(
                ['city_id' => $city->id, 'slug' => $this->slugify($neighborhood)],
                ['name' => $neighborhood, 'aliases' => []]
            );
        }

        foreach (self::PROPERTY_TYPES as $propertyType) {
            PropertyType::updateOrCreate(
                ['slug' => $this->slugify($propertyType['name'])],
                ['name' => $propertyType['name'], 'aliases' => $propertyType['aliases']]
            );
        }
    }

    private function slugify(string $name): string
    {
        return Str::slug($name);
    }
}
