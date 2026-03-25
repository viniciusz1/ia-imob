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
        'qtd_quartos',
        'area_m2',
    ];
}
