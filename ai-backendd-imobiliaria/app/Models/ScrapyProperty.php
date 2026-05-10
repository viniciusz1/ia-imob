<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ScrapyProperty extends Model
{
    use HasFactory;

    protected $table = 'scrapy-properties';

    protected $fillable = [
        'tipo',
        'imobiliaria',
        'valor',
        'bairro',
        'cidade',
        'imagem',
        'link_imovel',
        'descricao',
        'quartos',
        'suites',
        'banheiros',
        'vagas',
        'area',
        'aceita_permuta',
        'financiamento',
        'piscina',
        'churrasqueira',
        'academia',
        'salao_festas',
        'playground',
        'sacada',
        'mobiliado',
        'ar_condicionado',
        'lavanderia',
        'escritorio',
        'closet',
        'elevador',
        'portaria_24h',
        'andar',
        'posicao_solar',
        'ano_construcao',
    ];
}
