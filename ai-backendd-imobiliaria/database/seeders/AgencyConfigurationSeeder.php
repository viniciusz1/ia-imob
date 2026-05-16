<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AgencyConfigurationSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedAmizadeImobiliaria();
        $this->seedBetel();
        $this->seedBrandao();
        $this->seedCottageImoveis();
        $this->seedDonna();
        $this->seedECCorretores();
        $this->seedHabitat();
        $this->seedKrause();
        $this->seedM2();
        $this->seedPlaneta();
        $this->seedPoder();
        $this->seedPradi();
        $this->seedSplendore();
        $this->seedUrbana();
        $this->seedWSImveis();
        $this->seedAllianceImveis();
        $this->seedAtlanta();
        $this->seedBarraSul();
        $this->seedBetelSitemap();
        $this->seedBrisaImveis();
        $this->seedChal();
        $this->seedCidadeImoveis();
        $this->seedConexaoImoveis();
        $this->seedD2Imveis();
        $this->seedDonnaSitemap();
        $this->seedDualImobiliria();
        $this->seedECCorretoresdeImveis();
        $this->seedEskalaImveis();
        $this->seedFraitagi();
        $this->seedGirolla();
        $this->seedImob();
        $this->seedImobiliriaGuarImveis();
        $this->seedImobiliriaUrbana();
        $this->seedImveisPlaneta();
        $this->seedInovaEmpreendimentosImobiliarios();
        $this->seedItaivan();
        $this->seedJaragu();
        $this->seedLeilaImoveis();
        $this->seedMacro();
        $this->seedMega();
        $this->seedMillarImveis();
        $this->seedPradiSitemap();
        $this->seedSingular();
        $this->seedSmart();
        $this->seedguiaAzul();
    }

    private function insertField(array $data): void
    {
        DB::table('agency_field_extractors')->insert(array_merge([
            'priority' => 1,
            'selector_join' => false,
            'selector_params' => null,
            'selector_index' => null,
            'pipeline' => null,
            'is_optional' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ], $data));
    }

    private function seedAmizadeImobiliaria(): void
    {
        $id = DB::table('wsm_agencies')->insertGetId([
            'name' => 'Amizade Imobiliaria',
            'url' => 'https://amizadeimobiliaria.com.br/imoveis/a-venda?pagina=1',
            'url_pagination_template' => 'https://amizadeimobiliaria.com.br/imoveis/a-venda?pagina={page}',
            'total_pages_selector_type' => 'xpath',
            'total_pages_selector_value' => '//div[@data-pagination]//a[@data-page]/@data-page',
            'total_pages_formula' => 'max|fallback:ceil_div(len(//div[@data-search-results]/div[contains(@class,"col-md-6")]))',
            'cards_to_iterate_selector_type' => 'xpath',
            'cards_to_iterate_selector_value' => '//div[@data-search-results]/div[contains(@class,"col-md-6") and .//div[contains(@class,"thumbnail_one")]]//div[contains(@class,"thumbnail_one")]',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[contains(@class,"property-card-footer")]//a[@data-property-type]/@data-property-type','selector_join'=>false,'output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'tipo','priority'=>'2','source_type'=>'xpath','selector_value'=>'.//h2[contains(@class,"property_card_heading")]//span[contains(@class,"color-primary")]/text()','selector_join'=>false,'pipeline'=>'split:à Venda:0|strip','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[contains(@class,"property_pricing")]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//span[contains(@class,"property_card_address")]/@title','selector_join'=>false,'pipeline'=>'split:,:0|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[contains(@class,"card_property_description")]/p/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//span[contains(@class,"property_card_address")]/@title','selector_join'=>false,'pipeline'=>'split:,:1|split:-:0|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//picture/source[@type="image/jpeg"]/@srcset','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'link_imovel','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//a[contains(@class,"property-card-link")]/@href','selector_join'=>false,'pipeline'=>'template:https://amizadeimobiliaria.com.br{value}','output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'quartos','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[contains(@class,"thum_data")]//li/span/text()','selector_join'=>true,'pipeline'=>'regex_group:(\\d+).*quarto:1|join','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'banheiros','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[contains(@class,"thum_data")]//li/span/text()','selector_join'=>true,'pipeline'=>'regex_group:(\\d+).*banheir:1|join','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'vagas','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[contains(@class,"thum_data")]//li/span/text()','selector_join'=>true,'pipeline'=>'regex_group:(\\d+).*vaga:1|join','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'area','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[contains(@class,"thum_data")]//li/span/text()','selector_join'=>true,'pipeline'=>'regex_group:(\\d+).*m²:1|join','output_type'=>'float','is_optional'=>true],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedBetel(): void
    {
        $id = DB::table('wsm_agencies')->insertGetId([
            'name' => 'Betel',
            'url' => 'https://www.betelimoveissc.com.br/imovel/?finalidade=venda&tipo=&bairro=0&sui=&ban=&gar=&dor=&pag=1',
            'url_pagination_template' => 'https://www.betelimoveissc.com.br/imovel/?finalidade=venda&tipo=&bairro=0&sui=&ban=&gar=&dor=&pag={page}',
            'total_pages_selector_type' => 'css',
            'total_pages_selector_value' => 'p.topsearch__total > b::text',
            'total_pages_formula' => 'div:15',
            'cards_to_iterate_selector_type' => 'css',
            'cards_to_iterate_selector_value' => 'div.imovelcard',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//p[@class="imovelcard__info__ref"]/text()','selector_join'=>false,'pipeline'=>'replace:->|strip','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//p[@class="imovelcard__valor__valor"]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//h2[@class="imovelcard__info__local"]/text()','selector_join'=>false,'pipeline'=>'split:,:0|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//h3/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//h2[@class="imovelcard__info__local"]/text()','selector_join'=>false,'pipeline'=>'split:,:1|split:/:0|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//img/@src','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'link_imovel','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//a/@href','selector_join'=>false,'pipeline'=>'template:https://www.betelimoveissc.com.br{value}','output_type'=>'url','is_optional'=>false],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedBrandao(): void
    {
        $id = DB::table('wsm_agencies')->insertGetId([
            'name' => 'Brandao',
            'url' => 'https://www.imobiliariabrandao.com.br/filtro/list/venda/todos/todas/todos/0-10000000/todos/1',
            'url_pagination_template' => 'https://www.imobiliariabrandao.com.br/filtro/list/venda/todos/todas/todos/0-10000000/todos/{page}',
            'total_pages_selector_type' => 'xpath',
            'total_pages_selector_value' => '//div[contains(@class,"div-block-67")]//a[contains(@class,"button-2")]/text()',
            'total_pages_formula' => 'regex:^\\d+\$|max',
            'cards_to_iterate_selector_type' => 'xpath',
            'cards_to_iterate_selector_value' => '//a[contains(@class,"div-block-11") and contains(@href,"/imovel/")]',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[contains(@class,"heading-4")]/text()','selector_join'=>false,'pipeline'=>'split:,:0|strip','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[contains(@class,"text-block-11")]/text()','selector_join'=>false,'pipeline'=>'clean_text','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[contains(@class,"text-block-15")]/text()','selector_join'=>false,'pipeline'=>'split:,:0|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[contains(@class,"heading-4")]/text()','selector_join'=>false,'pipeline'=>'clean_text','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[contains(@class,"text-block-15")]/text()','selector_join'=>false,'pipeline'=>'split:,:1|split:-:0|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//img[contains(@class,"property-image")]/@src','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'link_imovel','priority'=>'1','source_type'=>'xpath','selector_value'=>'./@href','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'quartos','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[contains(@class,"feature")][span[@class="feature-escrita" and contains(normalize-space(),"Quarto(s)")]]/div[1]/text()','selector_join'=>false,'pipeline'=>'clean_text','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'suites','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[contains(@class,"feature")][span[@class="feature-escrita" and contains(normalize-space(),"Suite(s)")]]/div[1]/text()','selector_join'=>false,'pipeline'=>'clean_text','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'banheiros','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[contains(@class,"feature")][span[@class="feature-escrita" and contains(normalize-space(),"Banheiro(s)")]]/div[1]/text()','selector_join'=>false,'pipeline'=>'clean_text','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'vagas','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[contains(@class,"feature")][span[@class="feature-escrita" and contains(normalize-space(),"Vaga(s)")]]/div[1]/text()','selector_join'=>false,'pipeline'=>'clean_text','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'area','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[contains(@class,"feature")][span[@class="feature-escrita" and contains(normalize-space(),"Total")]]/div[1]/text()','selector_join'=>false,'pipeline'=>'clean_text','output_type'=>'float','is_optional'=>true],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedCottageImoveis(): void
    {
        $id = DB::table('wsm_agencies')->insertGetId([
            'name' => 'Cottage Imoveis',
            'url' => 'https://cottageimoveis.com.br/imoveis/venda',
            'url_pagination_template' => 'https://cottageimoveis.com.br/imoveis/venda?pagina={page}',
            'total_pages_selector_type' => 'literal',
            'total_pages_selector_value' => '1',
            'total_pages_formula' => null,
            'cards_to_iterate_selector_type' => 'xpath',
            'cards_to_iterate_selector_value' => '//div[contains(@class,"LI_Imovel") and contains(@class,"ImovelItem")]',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[contains(@class,"Categoria")]/text()','selector_join'=>false,'pipeline'=>'clean_text','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//h5[contains(@class,"ImovelValor")]//text()[normalize-space()]','selector_join'=>true,'pipeline'=>'replace:Valor de Venda>|replace:Valor de Aluguel>|strip','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//span[contains(@class,"Bairro")]/text()','selector_join'=>false,'pipeline'=>'clean_text','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//span[contains(@class,"ResumoItens")]//text()[normalize-space()]','selector_join'=>true,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'descricao','priority'=>'2','source_type'=>'xpath','selector_value'=>'.//a[contains(@class,"ImovelLinkClick")]/@title','selector_join'=>false,'pipeline'=>'clean_text','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//span[contains(@class,"cidade")]/text()','selector_join'=>false,'pipeline'=>'clean_text','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//a[contains(@class,"ImovelLinkClick")]//img/@src','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'link_imovel','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//a[contains(@class,"ImovelLinkClick")]/@href','selector_join'=>false,'pipeline'=>'template:https://cottageimoveis.com.br{value}','output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'quartos','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//span[contains(@class,"ResumoItem") and contains(@class,"BEDROOM")]//span[@class="val"]/text()','selector_join'=>false,'pipeline'=>'clean_text','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'suites','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//span[contains(@class,"ResumoItem") and contains(@class,"SUITE")]//span[@class="val"]/text()','selector_join'=>false,'pipeline'=>'clean_text','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'banheiros','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//span[contains(@class,"ResumoItem") and contains(@class,"BATHROOM")]//span[@class="val"]/text()','selector_join'=>false,'pipeline'=>'clean_text','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'vagas','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//span[contains(@class,"ResumoItem") and contains(@class,"GARAGE")]//span[@class="val"]/text()','selector_join'=>false,'pipeline'=>'clean_text','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'area','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//span[contains(@class,"ResumoItem") and contains(@class,"AREA_TOTAL")]//span[@class="val"]/text()','selector_join'=>false,'pipeline'=>'replace:m²>|strip','output_type'=>'float','is_optional'=>true],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedDonna(): void
    {
        $id = DB::table('wsm_agencies')->insertGetId([
            'name' => 'Donna',
            'url' => 'https://donnajaragua.com.br/imoveis?pretensao=comprar&bairros=&pagina=1',
            'url_pagination_template' => 'https://donnajaragua.com.br/imoveis?pretensao=comprar&bairros=&pagina={page}',
            'total_pages_selector_type' => 'css',
            'total_pages_selector_value' => 'h2::text',
            'total_pages_formula' => 'regex:^(\\d+)|div:24',
            'cards_to_iterate_selector_type' => 'css',
            'cards_to_iterate_selector_value' => 'div.block-imovel-box',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//h3/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[@class="valor"]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//h4/text()','selector_join'=>false,'pipeline'=>'split:,:0|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'literal','selector_value'=>'-','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//h4/text()','selector_join'=>false,'pipeline'=>'split:,:1|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[@class="foto-imovel"]/@style','selector_join'=>false,'pipeline'=>'replace:background-image:url(\'>|replace:'],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedECCorretores(): void
    {
        $id = DB::table('wsm_agencies')->insertGetId([
            'name' => 'EC Corretores',
            'url' => 'https://www.eccorretoresdeimoveis.com.br/imovel/venda/?&pag=1',
            'url_pagination_template' => 'https://www.eccorretoresdeimoveis.com.br/imovel/venda/?&pag={page}',
            'total_pages_selector_type' => 'css',
            'total_pages_selector_value' => 'div.topsearch__left p strong::text',
            'total_pages_formula' => 'div:15',
            'cards_to_iterate_selector_type' => 'css',
            'cards_to_iterate_selector_value' => 'div.imovelcard',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//p[@class="imovelcard__info__ref"]/text()','selector_join'=>false,'pipeline'=>'replace:->|strip','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//p[@class="imovelcard__valor__valor"]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//h2[@class="imovelcard__info__local"]/text()','selector_join'=>false,'pipeline'=>'split:,:0','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'literal','selector_value'=>'-','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//h2[@class="imovelcard__info__local"]/text()','selector_join'=>false,'pipeline'=>'split:,:1|split:/:0|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//img/@src','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'link_imovel','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//a/@href','selector_join'=>false,'pipeline'=>'template:https://www.eccorretoresdeimoveis.com.br{value}','output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'quartos','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[contains(@class,"imovelcard__info__feature")][i[contains(@class,"fa-bed")]]//p/b/text()','selector_join'=>false,'pipeline'=>'regex:\\d+','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'suites','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[contains(@class,"imovelcard__info__feature")][i[contains(@class,"fa-bath")]]//p/b/text()','selector_join'=>false,'pipeline'=>'regex:\\d+','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'banheiros','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[contains(@class,"imovelcard__info__feature")][i[contains(@class,"fa-shower")]]//p/b/text()','selector_join'=>false,'pipeline'=>'regex:\\d+','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'vagas','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[contains(@class,"imovelcard__info__feature")][i[contains(@class,"fa-car")]]//p/b/text()','selector_join'=>false,'pipeline'=>'regex:\\d+','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'area','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[contains(@class,"imovelcard__info__feature")][i[contains(@class,"fa-arrows-h")]]//p/b/text()','selector_join'=>false,'pipeline'=>'regex:\\d+[.,]?\\d*|replace:,>.','output_type'=>'float','is_optional'=>true],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedHabitat(): void
    {
        $id = DB::table('wsm_agencies')->insertGetId([
            'name' => 'Habitat',
            'url' => 'https://www.imobiliariahabitat.com.br/imoveis?pretensao=comprar&pagina=1',
            'url_pagination_template' => 'https://www.imobiliariahabitat.com.br/imoveis?pretensao=comprar&pagina={page}',
            'total_pages_selector_type' => 'css',
            'total_pages_selector_value' => 'div.pagination a::text',
            'total_pages_formula' => 'regex:^\\d+\$|max',
            'cards_to_iterate_selector_type' => 'xpath',
            'cards_to_iterate_selector_value' => '//div[contains(@class,"item")][.//div[contains(@class,"imo_info_box")]]',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[@class="imo_info_box"]/text()','selector_join'=>false,'pipeline'=>'split:-:0|strip','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//span[@class="prince"]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[@class="imo_info_box"]/text()','selector_join'=>false,'pipeline'=>'split:-:1|split:–:1|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[@class="title"]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[@class="imo_info_box"]/text()','selector_join'=>false,'pipeline'=>'split:-:1|split:–:0|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[@class="image"]/div/@style','selector_join'=>false,'pipeline'=>'\'replace:background:url(>|replace:) center no-repeat>|replace:background-size:cover'],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedKrause(): void
    {
        $id = DB::table('wsm_agencies')->insertGetId([
            'name' => 'Krause',
            'url' => 'https://krauseimobiliaria.com.br/imoveis/a-venda?pagina=1',
            'url_pagination_template' => 'https://krauseimobiliaria.com.br/imoveis/a-venda?pagina={page}',
            'total_pages_selector_type' => 'xpath',
            'total_pages_selector_value' => '//title/text()',
            'total_pages_formula' => 'regex:^\\d+|div:20|fallback:max(//ul[@class=\'pagination\']//a[@class=\'page-link\']/text())',
            'cards_to_iterate_selector_type' => 'xpath',
            'cards_to_iterate_selector_value' => '//div[contains(@class,"col-md-6")]/div[contains(@class,"thumbnail_one")]',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//h2//span[contains(@class,"color-primary")]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[@class="property_pricing"]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//span[contains(@class,"property_card_address")]/@title','selector_join'=>false,'pipeline'=>'split:,:0|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[@class="card_property_description"]/p/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//span[contains(@class,"property_card_address")]/@title','selector_join'=>false,'pipeline'=>'split:,:1|split:-:0|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//img/@src','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'link_imovel','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//a[contains(@class,"property-card-link")]/@href','selector_join'=>false,'pipeline'=>'template:https://krauseimobiliaria.com.br{value}','output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'quartos','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[@class="thum_data"]//ul/li/span/text()','selector_join'=>true,'pipeline'=>'regex_group:(\\d+)\\s*Quartos?:1|join','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'banheiros','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[@class="thum_data"]//ul/li/span/text()','selector_join'=>true,'pipeline'=>'regex_group:(\\d+)\\s*Banheiros?:1|join','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'vagas','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[@class="thum_data"]//ul/li/span/text()','selector_join'=>true,'pipeline'=>'regex_group:(\\d+)\\s*Vagas?:1|join','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'area','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[@class="thum_data"]//ul/li/span/text()','selector_join'=>true,'pipeline'=>'regex_group:(\\d+(?:[.,]\\d+)?)\\s*m²:1|join','output_type'=>'float','is_optional'=>true],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedM2(): void
    {
        $id = DB::table('wsm_agencies')->insertGetId([
            'name' => 'M2',
            'url' => 'https://m2jaragua.com.br/imoveis?pretensao=comprar&pagina=1',
            'url_pagination_template' => 'https://m2jaragua.com.br/imoveis?pretensao=comprar&pagina={page}',
            'total_pages_selector_type' => 'css',
            'total_pages_selector_value' => 'h1::text',
            'total_pages_formula' => 'regex:^(\\d+)|ceil_div:24',
            'cards_to_iterate_selector_type' => 'css',
            'cards_to_iterate_selector_value' => 'div.caixa_imovel',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[@class="texto_curto"]/text()','selector_join'=>false,'pipeline'=>'split: :0','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//span/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//h2/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[@class="texto_curto"]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//h3/text()','selector_join'=>false,'pipeline'=>'split:em:1|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[contains(@class,"active")]/div/@data-src','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'link_imovel','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//a[3]/@href','selector_join'=>false,'pipeline'=>'replace://>https://','output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'quartos','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//i[contains(@class,"fa-bed")]/../text()','selector_join'=>false,'pipeline'=>'clean_text|replace:->','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'banheiros','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//i[contains(@class,"fa-shower")]/../text()','selector_join'=>false,'pipeline'=>'clean_text|replace:->','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'vagas','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//i[contains(@class,"fa-car")]/../text()','selector_join'=>false,'pipeline'=>'clean_text|replace:->','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'area','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//i[contains(@class,"fa-object-group")]/../text()','selector_join'=>false,'pipeline'=>'replace:m²>|replace:m2>|strip','output_type'=>'float','is_optional'=>true],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedPlaneta(): void
    {
        $id = DB::table('wsm_agencies')->insertGetId([
            'name' => 'Planeta',
            'url' => 'https://www.imoveisplaneta.com.br/imoveis?pretensao=comprar&pagina=1',
            'url_pagination_template' => 'https://www.imoveisplaneta.com.br/imoveis?pretensao=comprar&pagina={page}',
            'total_pages_selector_type' => 'css',
            'total_pages_selector_value' => 'h2::text',
            'total_pages_formula' => 'regex:\\d+|div:24',
            'cards_to_iterate_selector_type' => 'css',
            'cards_to_iterate_selector_value' => 'div.block-imoveis-list div.col-12 > a',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//h3/text()','selector_join'=>false,'pipeline'=>'split:em:0|strip','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[@class="valor-imovel-lista"]/span/text()','selector_join'=>false,'pipeline'=>'clean_text','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//h3/text()','selector_join'=>false,'pipeline'=>'split:em:1|split:,:0|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[@class="desc-curta-imovel-lista"]/h6/text()','selector_join'=>false,'pipeline'=>'clean_text','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//h3/text()','selector_join'=>false,'pipeline'=>'split:em:1|split:,:1|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[@class="img-imovel"]/@style','selector_join'=>false,'pipeline'=>'replace:background-image:url(>|replace:)>|strip','output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'link_imovel','priority'=>'1','source_type'=>'xpath','selector_value'=>'@href','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'quartos','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//span[@class="bed"]/span[@class="txt_icon"]/text()','selector_join'=>false,'pipeline'=>'clean_text','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'suites','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//span[@class="bed"]/small/text()','selector_join'=>false,'pipeline'=>'regex:\\d+','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'banheiros','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//span[@class="wc"]/span[@class="txt_icon"]/text()','selector_join'=>false,'pipeline'=>'clean_text','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'vagas','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//span[@class="vacancies"]/span[@class="txt_icon"]/text()','selector_join'=>false,'pipeline'=>'clean_text','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'area','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//span[@class="area_total"]/span[@class="txt_icon"]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedPoder(): void
    {
        $id = DB::table('wsm_agencies')->insertGetId([
            'name' => 'Poder',
            'url' => 'https://www.poderimoveis.com/imoveis/venda-pagina-1',
            'url_pagination_template' => 'https://www.poderimoveis.com/imoveis/venda-pagina-{page}',
            'total_pages_selector_type' => 'xpath',
            'total_pages_selector_value' => '//div[contains(@class,"jetpagination")]/@data-total',
            'total_pages_formula' => 'ceil_div:len(//a[contains(@class,"ui__card-link")])|fallback:8',
            'cards_to_iterate_selector_type' => 'xpath',
            'cards_to_iterate_selector_value' => '//a[contains(@class,"ui__card-link")]',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//p[contains(@class,"ui__card-property")]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//p[contains(@class,"ui__card__price")]//text()[normalize-space()]','selector_join'=>true,'pipeline'=>'strip','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//p[contains(@class,"ui__card-address")]/text()','selector_join'=>false,'pipeline'=>'split:-:1|split:,:0|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//p[not(contains(@class,"ui__card-property")) and not(contains(@class,"ui__card-reference")) and not(contains(@class,"ui__card-address")) and not(contains(@class,"ui__card__price")) and string-length(normalize-space(text())) > 30]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//p[contains(@class,"ui__card-address")]/text()','selector_join'=>false,'pipeline'=>'split:-:1|split:,:1|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//img[contains(@class,"ui__card-img")]/@src','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'link_imovel','priority'=>'1','source_type'=>'xpath','selector_value'=>'@href','selector_join'=>false,'pipeline'=>'template:https://www.poderimoveis.com{value}','output_type'=>'url','is_optional'=>false],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedPradi(): void
    {
        $id = DB::table('wsm_agencies')->insertGetId([
            'name' => 'Pradi',
            'url' => 'https://www.imobiliariapradi.com.br/imoveis?pagina=1',
            'url_pagination_template' => 'https://www.imobiliariapradi.com.br/imoveis?pagina={page}',
            'total_pages_selector_type' => 'css',
            'total_pages_selector_value' => 'span.h-money::text',
            'total_pages_formula' => 'div:12',
            'cards_to_iterate_selector_type' => 'css',
            'cards_to_iterate_selector_value' => 'a.car-with-buttons',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//p[@class="card-with-buttons__title"]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//p[@class="card-with-buttons__value"]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//h2[@class="card-with-buttons__heading"]/text()','selector_join'=>false,'pipeline'=>'split:-:0','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'literal','selector_value'=>'-','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//h2[@class="card-with-buttons__heading"]/text()','selector_join'=>false,'pipeline'=>'split:-:1','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//img/@src','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'link_imovel','priority'=>'1','source_type'=>'xpath','selector_value'=>'./@href','selector_join'=>false,'pipeline'=>'template:https://www.imobiliariapradi.com.br{value}','output_type'=>'url','is_optional'=>false],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedSplendore(): void
    {
        $id = DB::table('wsm_agencies')->insertGetId([
            'name' => 'Splendore',
            'url' => 'https://www.splendoreimoveis.com/imoveis?pretensao=comprar&gad_source=1&gclid=Cj0KCQiA8fW9BhC8ARIsACwHqYro9Ffcq66il4Nh77oWbxTNX0IXvmj5XKutIrXpN3jTWcL3rgH5HGUaAp9REALw_wcB&pagina=1',
            'url_pagination_template' => 'https://www.splendoreimoveis.com/imoveis?pretensao=comprar&gad_source=1&gclid=Cj0KCQiA8fW9BhC8ARIsACwHqYro9Ffcq66il4Nh77oWbxTNX0IXvmj5XKutIrXpN3jTWcL3rgH5HGUaAp9REALw_wcB&pagina={page}',
            'total_pages_selector_type' => 'xpath',
            'total_pages_selector_value' => '//div[@class=\'title\']/h1/text()',
            'total_pages_formula' => 'regex:\\d+ | ceil_div:24',
            'cards_to_iterate_selector_type' => 'xpath',
            'cards_to_iterate_selector_value' => '//div[@class=\'caixa_imovel\']',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[@class="area_localizacao_texto"]/h3/text()','pipeline'=>'split: :0','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[@class="valor_imovel"]/span/text()','pipeline'=>'split: :1','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[@class="area_localizacao_texto"]/h2/text()','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[@class="texto_curto"]/text()','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[@class="area_localizacao_texto"]/h3/text()','pipeline'=>'split:em:1 | strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'link_imovel','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//a[div[@class="gradient"]]/@href','pipeline'=>'template:https:{value}','output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[contains(@class,"active")]/div[contains(@class,"lazy")]/@data-src','output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'imagem','priority'=>'2','source_type'=>'xpath','selector_value'=>'.//div[@class="foto_imovel"]/@style','pipeline'=>'replace:background: url(> | replace:)> | strip','output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'link_imovel','priority'=>'2','source_type'=>'xpath','selector_value'=>'.//a/@href','pipeline'=>'template:https:{value}','output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'quartos','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//i[contains(@class, "fa-bed")]/../text()','pipeline'=>'clean_text | replace:->','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'banheiros','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//i[contains(@class, "fa-shower")]/../text()','pipeline'=>'clean_text | replace:->','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'vagas','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//i[contains(@class, "fa-car")]/../text()','pipeline'=>'clean_text | replace:->','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'area','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//i[contains(@class, "fa-object-group")]/../text()','pipeline'=>'replace:m²> | replace:m2> | replace:,>. | strip','output_type'=>'float','is_optional'=>true],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedUrbana(): void
    {
        $id = DB::table('wsm_agencies')->insertGetId([
            'name' => 'Urbana',
            'url' => 'https://www.imobiliariaurbana.com.br/comprar?page=1',
            'url_pagination_template' => 'https://www.imobiliariaurbana.com.br/comprar?page={page}',
            'total_pages_selector_type' => 'css',
            'total_pages_selector_value' => 'ul.pagination *::text',
            'total_pages_formula' => 'regex:\\d+|max',
            'cards_to_iterate_selector_type' => 'css',
            'cards_to_iterate_selector_value' => 'div.card.border-0.shadow-sm.rounded-4',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//h3[@class="card-title"]/text()','selector_join'=>false,'pipeline'=>'split: :0','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//span[@class="bg-price"]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//p[@class="card-text"]/text()','selector_join'=>false,'pipeline'=>'split:,:0|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'literal','selector_value'=>'-','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//p[@class="card-text"]/text()','selector_join'=>false,'pipeline'=>'split:,:1|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//img[@class="card-img-top"]/@src','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'link_imovel','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//a[@class="property-link"]/@href','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'quartos','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[@class="d-flex small-icons"]/span[contains(.,"Dorms")]//text()','selector_join'=>true,'pipeline'=>'regex:\\d+|join','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'suites','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[@class="d-flex small-icons"]/span[contains(.,"Suítes")]//text()','selector_join'=>true,'pipeline'=>'regex:\\d+|join','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'banheiros','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[@class="d-flex small-icons"]/span[contains(.,"Banheiros")]//text()','selector_join'=>true,'pipeline'=>'regex:\\d+|join','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'vagas','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[@class="d-flex small-icons"]/span[contains(.,"Vagas")]//text()','selector_join'=>true,'pipeline'=>'regex:\\d+|join','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'area','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[@class="d-flex small-icons"]/span[contains(.,"M²")]//text()','selector_join'=>true,'pipeline'=>'regex:\\d+[.,]?\\d*|join','output_type'=>'float','is_optional'=>true],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedWSImveis(): void
    {
        $id = DB::table('wsm_agencies')->insertGetId([
            'name' => 'WS Imóveis',
            'url' => 'https://www.wsimoveis.net/index.php?pg=imoveis',
            'url_pagination_template' => 'https://www.wsimoveis.net/index.php?pg=imoveis&pagina={page}',
            'total_pages_selector_type' => 'xpath',
            'total_pages_selector_value' => 'normalize-space(//p[contains(.,"resultado(s)")])',
            'total_pages_formula' => 'regex:\\d+ | ceil_div:len(//ul[contains(@class,"uk-grid-match")]/li[.//a[contains(@href,"pg=imovel&id=")]])',
            'cards_to_iterate_selector_type' => 'xpath',
            'cards_to_iterate_selector_value' => '//ul[contains(@class,"uk-grid-match")]/li[.//a[contains(@href,"pg=imovel&id=")]]',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[contains(@class,"uk-card-body")]/p[1]//text()[normalize-space()]','selector_join'=>true,'pipeline'=>'split:|:-1|strip','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'normalize-space(.//p[contains(@class,"uk-text-bold")][1])','selector_join'=>false,'pipeline'=>'regex:R\\\$\\s*[\\d.,]+','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[contains(@class,"uk-card-body")]/p[1]//text()[normalize-space()]','selector_join'=>true,'pipeline'=>'split:|:1|split:-:0|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[contains(@class,"uk-card-body")]/p[1]//text()[normalize-space()]','selector_join'=>true,'pipeline'=>'split:|:0|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//div[contains(@class,"uk-card-body")]/p[1]//text()[normalize-space()]','selector_join'=>true,'pipeline'=>'split:|:1|split:-:1|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//a[contains(@href,"pg=imovel&id=")][1]//img/@src','selector_join'=>false,'pipeline'=>'template:https://www.wsimoveis.net/{value}','output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'wsm','agency_id'=>$id,'field_name'=>'link_imovel','priority'=>'1','source_type'=>'xpath','selector_value'=>'.//a[contains(@href,"pg=imovel&id=")][1]/@href','selector_join'=>false,'pipeline'=>'template:https://www.wsimoveis.net/{value}','output_type'=>'url','is_optional'=>false],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedAllianceImveis(): void
    {
        $id = DB::table('sitemap_agencies')->insertGetId([
            'name' => 'Alliance Imóveis',
            'domain' => 'allianceimoveis.net.br',
            'sitemap_url' => 'https://allianceimoveis.net.br/sitemap/buildings.xml',
            'allowed_url_patterns' => null,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[contains(@class, "category")]/td[contains(@class, "Value")]/text()','selector_join'=>false,'pipeline'=>'split:»:-1 | strip','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'2','source_type'=>'og','selector_value'=>'title','selector_join'=>false,'pipeline'=>'split: :0','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'3','source_type'=>'literal','selector_value'=>'Desconhecido','selector_join'=>false,'output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class, "IMOVEL_VALOR")]//span[contains(@class, "Valor")]//text()','selector_join'=>true,'pipeline'=>'strip','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'2','source_type'=>'xpath','selector_value'=>'//*[contains(text(), "R\$")]/text()','selector_join'=>true,'pipeline'=>'regex:R\\\$\\s*[\\d\\.,]+','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class, "IMOVEL_LOCALIZACAO")]//td[contains(@class, "Label") and contains(text(), "Bairro")]/following-sibling::td[contains(@class, "Value")]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'2','source_type'=>'og','selector_value'=>'title','selector_join'=>false,'pipeline'=>'split:/:1 | split:, :0 | strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class, "IMOVEL_LOCALIZACAO")]//td[contains(@class, "Label") and contains(text(), "Cidade")]/following-sibling::td[contains(@class, "Value")]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'2','source_type'=>'og','selector_value'=>'description','selector_join'=>false,'pipeline'=>'regex_group:em\\s+([^,]+):1 | strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'og','selector_value'=>'description','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'og','selector_value'=>'image','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'quartos','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[contains(@class, "bedroom")]/td[contains(@class, "Value")]/text()','selector_join'=>false,'pipeline'=>'regex:\\d+','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'suites','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[contains(@class, "bedroom")]/td[contains(@class, "Value")]/text()','selector_join'=>false,'pipeline'=>'regex_group:sendo\\s+(\\d+)\\s*su[ií]te:1','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'banheiros','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[contains(@class, "bathroom")]/td[contains(@class, "Value")]/text()','selector_join'=>false,'pipeline'=>'regex:\\d+','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'vagas','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[contains(@class, "garage")]/td[contains(@class, "Value")]/text()','selector_join'=>false,'pipeline'=>'regex:\\d+','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[contains(@class, "area_useful")]/td[contains(@class, "Value")]/text()','selector_join'=>false,'pipeline'=>'regex_group:(\\d+(?:[.,]\\d+)?)\\s*m:1 | replace:,>.','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'2','source_type'=>'xpath','selector_value'=>'//tr[contains(@class, "area_total")]/td[contains(@class, "Value")]/text()','selector_join'=>false,'pipeline'=>'regex_group:(\\d+(?:[.,]\\d+)?)\\s*m:1 | replace:,>.','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'3','source_type'=>'xpath','selector_value'=>'//tr[contains(@class, "area_private")]/td[contains(@class, "Value")]/text()','selector_join'=>false,'pipeline'=>'regex_group:(\\d+(?:[.,]\\d+)?)\\s*m:1 | replace:,>.','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'mobiliado','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[contains(@class, "furnishing")]/td[contains(@class, "Value")]/text()','selector_join'=>false,'pipeline'=>'strip | contains:mobiliado','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'ar_condicionado','priority'=>'1','source_type'=>'xpath','selector_value'=>'//li[contains(@class, "Arcondicionado")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'churrasqueira','priority'=>'1','source_type'=>'xpath','selector_value'=>'//li[contains(@class, "Churrasqueira")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'lavanderia','priority'=>'1','source_type'=>'xpath','selector_value'=>'//li[contains(@class, "Lavanderia")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'piscina','priority'=>'1','source_type'=>'xpath','selector_value'=>'//li[contains(@class, "PiscinaAquecida")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'piscina','priority'=>'2','source_type'=>'xpath','selector_value'=>'//li[contains(@class, "Piscina")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'aceita_permuta','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class, "IMOVEL_VALOR")]//div[contains(@class, "Aceita")][contains(text(), "Permuta")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'financiamento','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class, "IMOVEL_VALOR")]//div[contains(@class, "Aceita")][contains(text(), "Financiamento")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedAtlanta(): void
    {
        $id = DB::table('sitemap_agencies')->insertGetId([
            'name' => 'Atlanta',
            'domain' => 'atlantaimoveis.com',
            'sitemap_url' => 'https://atlantaimoveis.com/sitemap.xml',
            'allowed_url_patterns' => '/imovel/',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'og','selector_value'=>'title','selector_join'=>false,'pipeline'=>'split: :0','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'//script[@type="application/ld+json" and contains(text(),"Product")]/text()','selector_join'=>false,'pipeline'=>'regex_group:"price"\\s*:\\s*"?([\\d.,]+)"?:1','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'//h1/text()','selector_join'=>false,'pipeline'=>'split:,:0|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'//script[@type="application/ld+json" and contains(text(),"Product")]/text()','selector_join'=>false,'pipeline'=>'regex_group:"addressLocality"\\s*:\\s*"([^"]+)":1','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'og','selector_value'=>'description','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'og','selector_value'=>'image','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'quartos','priority'=>'1','source_type'=>'xpath','selector_value'=>'//script[@type="application/ld+json" and contains(text(),"Product")]/text()','selector_join'=>false,'pipeline'=>'regex_group:"numberOfBedrooms"\\s*:\\s*(\\d+):1','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'suites','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"composition_card")][contains(normalize-space(),"Suíte")]//div[contains(@class,"composition_name")]/text()','selector_join'=>false,'pipeline'=>'regex:\\d+','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'banheiros','priority'=>'1','source_type'=>'xpath','selector_value'=>'//script[@type="application/ld+json" and contains(text(),"Product")]/text()','selector_join'=>false,'pipeline'=>'regex_group:"numberOfBathroomsTotal"\\s*:\\s*(\\d+):1','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'vagas','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"composition_card")][contains(normalize-space(),"Vaga")]//div[contains(@class,"composition_name")]/text()','selector_join'=>false,'pipeline'=>'regex:\\d+','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"composition_card")][contains(normalize-space(),"m²")]//div[contains(@class,"composition_name")]/text()','selector_join'=>false,'pipeline'=>'regex_group:([\\d.,]+):1|replace:,>.','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'academia','priority'=>'1','source_type'=>'xpath','selector_value'=>'//span[contains(@class,"characteristic-tag")][contains(normalize-space(),"Academia")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'churrasqueira','priority'=>'1','source_type'=>'xpath','selector_value'=>'//span[contains(@class,"characteristic-tag")][contains(normalize-space(),"Churrasqueira")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'piscina','priority'=>'1','source_type'=>'xpath','selector_value'=>'//span[contains(@class,"characteristic-tag")][contains(normalize-space(),"Piscina")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'salao_festas','priority'=>'1','source_type'=>'xpath','selector_value'=>'//span[contains(@class,"characteristic-tag")][contains(normalize-space(),"Salão de Festas")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'playground','priority'=>'1','source_type'=>'xpath','selector_value'=>'//span[contains(@class,"characteristic-tag")][contains(normalize-space(),"Playground")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'elevador','priority'=>'1','source_type'=>'xpath','selector_value'=>'//span[contains(@class,"characteristic-tag")][contains(normalize-space(),"Elevador")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'lavanderia','priority'=>'1','source_type'=>'xpath','selector_value'=>'//span[contains(@class,"characteristic-tag")][contains(normalize-space(),"Lavanderia")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'mobiliado','priority'=>'1','source_type'=>'xpath','selector_value'=>'//span[contains(@class,"characteristic-tag")][contains(normalize-space(),"Mobiliado")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'financiamento','priority'=>'1','source_type'=>'og','selector_value'=>'description','selector_join'=>false,'pipeline'=>'contains:financia|bool','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'aceita_permuta','priority'=>'1','source_type'=>'og','selector_value'=>'description','selector_join'=>false,'pipeline'=>'contains:permuta|bool','output_type'=>'bool','is_optional'=>true],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedBarraSul(): void
    {
        $id = DB::table('sitemap_agencies')->insertGetId([
            'name' => 'Barra Sul',
            'domain' => 'imobiliariabarrasul.com',
            'sitemap_url' => 'https://www.imobiliariabarrasul.com/sitemap.xml',
            'allowed_url_patterns' => '/imovel/',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'og','selector_value'=>'title','selector_join'=>false,'pipeline'=>'split: :0|capitalize','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"heading-properties")]//h3/span/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"heading-properties")]//p/i[contains(@class,"fa-map-marker")]/following-sibling::text()[1]','selector_join'=>false,'pipeline'=>'split:-:0|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"heading-properties")]//p/i[contains(@class,"fa-map-marker")]/following-sibling::text()[1]','selector_join'=>false,'pipeline'=>'split:-:1|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"properties-description")]//text()','selector_join'=>true,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'2','source_type'=>'og','selector_value'=>'description','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'og','selector_value'=>'image','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'quartos','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[contains(@class,"condition")]/li[contains(.,"Quartos")]','selector_join'=>false,'pipeline'=>'regex_group:(\\d+[.,]?\\d*):1','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'suites','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[contains(@class,"condition")]/li[contains(.,"Suíte")]','selector_join'=>false,'pipeline'=>'regex_group:(\\d+[.,]?\\d*):1','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'banheiros','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[contains(@class,"condition")]/li[contains(.,"Banheiro")]','selector_join'=>false,'pipeline'=>'regex_group:(\\d+[.,]?\\d*):1','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'vagas','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[contains(@class,"condition")]/li[contains(.,"Garag")]','selector_join'=>false,'pipeline'=>'regex_group:(\\d+[.,]?\\d*):1','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[contains(@class,"condition")]/li[contains(.,"Privativos")]','selector_join'=>false,'pipeline'=>'regex_group:([\\d.,]+):1','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'financiamento','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"properties-description")]//text()','selector_join'=>true,'pipeline'=>'contains:financiamento|bool','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'sacada','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[@class="amenities"]/li[contains(.,"Sacada")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'churrasqueira','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[@class="amenities"]/li[contains(.,"Churrasqueira")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'piscina','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[@class="amenities"]/li[contains(.,"Piscina")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'playground','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[@class="amenities"]/li[contains(.,"Playground")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'ar_condicionado','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[@class="amenities"]/li[contains(.,"Ar Condicionado")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'mobiliado','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[@class="amenities"]/li[contains(.,"Mobiliado")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedBetelSitemap(): void
    {
        $id = DB::table('sitemap_agencies')->insertGetId([
            'name' => 'Betel',
            'domain' => 'betelimoveissc.com.br',
            'sitemap_url' => 'https://betelimoveissc.com.br/sitemap/buildings.xml',
            'allowed_url_patterns' => null,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'og','selector_value'=>'title','selector_join'=>false,'pipeline'=>'split: :0|capitalize','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'//span[contains(@class,"ValorMoeda") or contains(@class,"Valor")]/text()','selector_join'=>true,'pipeline'=>'regex:R\\\$\\s*[\\d.,]+|max','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'//title/text()','selector_join'=>false,'pipeline'=>'split:|:1|split:,:0|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'//title/text()','selector_join'=>false,'pipeline'=>'split:|:1|split:,:1|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'og','selector_value'=>'description','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'og','selector_value'=>'image','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'quartos','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[contains(@class,"bedroom")]//td[@class="Value"]//text()','selector_join'=>false,'pipeline'=>'regex:\\d+','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'suites','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[contains(@class,"bedroom")]//td[@class="Value"]//text()','selector_join'=>false,'pipeline'=>'regex_group:sendo\\s+(\\d+)\\s+suíte:1','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'banheiros','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[contains(@class,"bathroom")]//td[@class="Value"]//text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'vagas','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[contains(@class,"garage")]//td[@class="Value"]//text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[contains(@class,"area_private")]//td[@class="Value"]//text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'2','source_type'=>'xpath','selector_value'=>'//tr[contains(@class,"area_ground")]//td[@class="Value"]//text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedBrisaImveis(): void
    {
        $id = DB::table('sitemap_agencies')->insertGetId([
            'name' => 'Brisa Imóveis',
            'domain' => 'brisaimoveis.com',
            'sitemap_url' => 'https://brisaimoveis.com/sitemap/buildings.xml',
            'allowed_url_patterns' => null,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="category"]//td[@class="Value"]//text()','selector_join'=>true,'pipeline'=>'split:»:-1|strip','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="Venda"]//span[contains(@class,"value")]//text()','selector_join'=>true,'pipeline'=>'strip','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'//td[contains(@class,"Label") and contains(text(),"Bairro")]/following-sibling::td[contains(@class,"Value")]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'//td[contains(@class,"Label") and contains(text(),"Cidade")]/following-sibling::td[contains(@class,"Value")]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'og','selector_value'=>'description','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'og','selector_value'=>'image','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'quartos','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="bedroom"]//td[@class="Value"]//text()','selector_join'=>false,'pipeline'=>'regex:\\d+','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'suites','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="bedroom"]//td[@class="Value"]//text()','selector_join'=>false,'pipeline'=>'regex_group:sendo\\s+(\\d+)\\s+suíte:1','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'banheiros','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="bathroom"]//td[@class="Value"]//text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'vagas','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="garage"]//td[@class="Value"]//text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="area_private"]//td[@class="Value"]//text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'2','source_type'=>'xpath','selector_value'=>'//tr[@class="area_ground"]//td[@class="Value"]//text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedChal(): void
    {
        $id = DB::table('sitemap_agencies')->insertGetId([
            'name' => 'Chalé',
            'domain' => 'chaleimobiliaria.com.br',
            'sitemap_url' => 'https://chaleimobiliaria.com.br/sitemap.xml',
            'allowed_url_patterns' => '/imovel/',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[@id="property-details-tracking"]/@data-type','selector_join'=>false,'pipeline'=>'capitalize','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'2','source_type'=>'og','selector_value'=>'title','selector_join'=>false,'pipeline'=>'split: :0','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[@id="property-details-tracking"]/@data-price-venda','selector_join'=>false,'output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[@id="property-details-tracking"]/@data-neighborhood','selector_join'=>false,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[@id="property-details-tracking"]/@data-city','selector_join'=>false,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'xpath','selector_value'=>'//h4[contains(normalize-space(),"Descrição")]/following-sibling::p[1]//text()','selector_join'=>true,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'xpath','selector_value'=>'//img[contains(@alt,"Imagem da propriedade")]/@src','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'2','source_type'=>'og','selector_value'=>'image','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'quartos','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[@id="property-details-tracking"]/@data-bedrooms','selector_join'=>false,'output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'banheiros','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[@id="property-details-tracking"]/@data-bathrooms','selector_join'=>false,'output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[@id="property-details-tracking"]/@data-area','selector_join'=>false,'output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'vagas','priority'=>'1','source_type'=>'xpath','selector_value'=>'//*[contains(text(),"vaga") or contains(text(),"Vaga")]/text()','selector_join'=>false,'pipeline'=>'regex:\\d+','output_type'=>'float','is_optional'=>true],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedCidadeImoveis(): void
    {
        $id = DB::table('sitemap_agencies')->insertGetId([
            'name' => 'Cidade Imoveis',
            'domain' => 'imoveiscidade.com.br',
            'sitemap_url' => 'https://imoveiscidade.com.br/sitemap.xml',
            'allowed_url_patterns' => '/imovel/',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'og','selector_value'=>'title','selector_join'=>false,'pipeline'=>'split:-:0|strip','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'//span[contains(normalize-space(),"R\$")]/text()','selector_join'=>false,'pipeline'=>'regex:R\\\$\\s*[\\d.,]+','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'og','selector_value'=>'title','selector_join'=>false,'pipeline'=>'split:-:-1|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'og','selector_value'=>'title','selector_join'=>false,'pipeline'=>'split:/:-1|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'og','selector_value'=>'description','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'og','selector_value'=>'image','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedConexaoImoveis(): void
    {
        $id = DB::table('sitemap_agencies')->insertGetId([
            'name' => 'Conexao Imoveis',
            'domain' => 'imobiliariaconexaoimoveis.com.br',
            'sitemap_url' => 'https://www.imobiliariaconexaoimoveis.com.br/sitemap.xml',
            'allowed_url_patterns' => '/imovel/',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'og','selector_value'=>'title','selector_join'=>false,'pipeline'=>'regex_group:^\\s*(.*?)\\s+para\\s+:1|strip','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'//h6[contains(@class,"preco-imovel")]/text()','selector_join'=>false,'pipeline'=>'regex:R\\\$\\s*[\\d.,]+','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'//p[contains(@class,"sub-titulo")]/text()','selector_join'=>false,'pipeline'=>'split:,:0|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'//p[contains(@class,"sub-titulo")]/text()','selector_join'=>false,'pipeline'=>'split:,:1|split:-:0|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'xpath','selector_value'=>'//p[contains(@class,"descricao")]//text()','selector_join'=>true,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'og','selector_value'=>'image','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'quartos','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"icon_detalhes") and not(contains(@class,"hide"))]//p/text()','selector_join'=>true,'pipeline'=>'regex_group:(\\d+).*quarto:1|join','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'banheiros','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"icon_detalhes") and not(contains(@class,"hide"))]//p/text()','selector_join'=>true,'pipeline'=>'regex_group:(\\d+).*banheiro:1|join','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'vagas','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"icon_detalhes") and not(contains(@class,"hide"))]//p/text()','selector_join'=>true,'pipeline'=>'regex_group:(\\d+).*vaga:1|join','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'suites','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"icon_detalhes") and not(contains(@class,"hide"))]//p/text()','selector_join'=>true,'pipeline'=>'regex_group:(\\d+).*suíte:1|join','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"icon_detalhes") and not(contains(@class,"hide"))]//p/text()','selector_join'=>true,'pipeline'=>'regex_group:(\\d+(?:[.,]\\d+)?)\\s*m[²2]:1|join','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'ar_condicionado','priority'=>'1','source_type'=>'xpath','selector_value'=>'//li[contains(@class,"caracteristicas-extras")][contains(.,"Ar condicionado")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'piscina','priority'=>'1','source_type'=>'xpath','selector_value'=>'//li[contains(@class,"caracteristicas-extras")][contains(.,"Piscina")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'churrasqueira','priority'=>'1','source_type'=>'xpath','selector_value'=>'//li[contains(@class,"caracteristicas-extras")][contains(.,"Churrasqueira")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'academia','priority'=>'1','source_type'=>'xpath','selector_value'=>'//li[contains(@class,"caracteristicas-extras")][contains(.,"Academia")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'salao_festas','priority'=>'1','source_type'=>'xpath','selector_value'=>'//li[contains(@class,"caracteristicas-extras")][contains(.,"Salão de festas")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'playground','priority'=>'1','source_type'=>'xpath','selector_value'=>'//li[contains(@class,"caracteristicas-extras")][contains(.,"Playground")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedD2Imveis(): void
    {
        $id = DB::table('sitemap_agencies')->insertGetId([
            'name' => 'D2 Imóveis',
            'domain' => 'd2imoveis.com',
            'sitemap_url' => 'https://d2imoveis.com/sitemap/buildings.xml',
            'allowed_url_patterns' => null,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="category"]//td[@class="Value"]//text()','selector_join'=>true,'pipeline'=>'split:»:-1|strip','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="Venda"]//span[contains(@class,"value")]//text()','selector_join'=>true,'pipeline'=>'strip','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'//td[contains(@class,"Label") and contains(text(),"Bairro")]/following-sibling::td[contains(@class,"Value")]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'//td[contains(@class,"Label") and contains(text(),"Cidade")]/following-sibling::td[contains(@class,"Value")]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'og','selector_value'=>'description','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'og','selector_value'=>'image','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'quartos','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="bedroom"]//td[@class="Value"]//text()','selector_join'=>false,'pipeline'=>'regex:\\d+','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'suites','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="bedroom"]//td[@class="Value"]//text()','selector_join'=>false,'pipeline'=>'regex_group:sendo\\s+(\\d+)\\s+suíte:1','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'banheiros','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="bathroom"]//td[@class="Value"]//text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'vagas','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="garage"]//td[@class="Value"]//text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="area_private"]//td[@class="Value"]//text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'2','source_type'=>'xpath','selector_value'=>'//tr[@class="area_ground"]//td[@class="Value"]//text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedDonnaSitemap(): void
    {
        $id = DB::table('sitemap_agencies')->insertGetId([
            'name' => 'Donna',
            'domain' => 'donnajaragua.com.br',
            'sitemap_url' => 'https://donnajaragua.com.br/sitemap.xml',
            'allowed_url_patterns' => null,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'//h1[@class="title-imovel"]/text()','selector_join'=>false,'pipeline'=>'regex_group:^(.*?)\\s+em\\s+:1','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[@class="valores"]//span/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'//h1[@class="title-imovel"]/text()','selector_join'=>false,'pipeline'=>'regex_group:bairro\\s+(.*?)(?:\\.|\$):1','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'2','source_type'=>'og','selector_value'=>'title','selector_join'=>false,'pipeline'=>'regex_group:^(.*?)\\s+-\\s+Donna:1','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'//h1[@class="title-imovel"]/text()','selector_join'=>false,'pipeline'=>'regex_group:em\\s+(.*?),:1','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'2','source_type'=>'og','selector_value'=>'title','selector_join'=>false,'pipeline'=>'regex_group:^(.*?)\\s*,:1','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[@class="descricao-texto"]/text()','selector_join'=>true,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'og','selector_value'=>'image','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'quartos','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[@class="block-itens-imovel"]//li[contains(.,"dormitório")]//span/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'suites','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[@class="block-itens-imovel"]//li[contains(.,"suíte")]//span/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'banheiros','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[@class="block-itens-imovel"]//li[contains(.,"banheiro")]//span/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'vagas','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[@class="block-itens-imovel"]//li[contains(.,"vaga")]//span/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[@class="block-itens-imovel"]//li[contains(.,"Área Privativa")]//span/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'2','source_type'=>'xpath','selector_value'=>'//div[@class="block-itens-imovel"]//li[contains(.,"Área Total")]//span/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'financiamento','priority'=>'1','source_type'=>'xpath','selector_value'=>'//body//text()','selector_join'=>true,'pipeline'=>'contains:financiamento|bool','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'mobiliado','priority'=>'1','source_type'=>'xpath','selector_value'=>'//body//text()','selector_join'=>true,'pipeline'=>'contains:mobilia|bool','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'piscina','priority'=>'1','source_type'=>'xpath','selector_value'=>'//body//text()','selector_join'=>true,'pipeline'=>'contains:piscina|bool','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'churrasqueira','priority'=>'1','source_type'=>'xpath','selector_value'=>'//body//text()','selector_join'=>true,'pipeline'=>'contains:churrasqueira|bool','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'closet','priority'=>'1','source_type'=>'xpath','selector_value'=>'//body//text()','selector_join'=>true,'pipeline'=>'contains:closet|bool','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'escritorio','priority'=>'1','source_type'=>'xpath','selector_value'=>'//body//text()','selector_join'=>true,'pipeline'=>'contains:escritor|bool','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'lavanderia','priority'=>'1','source_type'=>'xpath','selector_value'=>'//body//text()','selector_join'=>true,'pipeline'=>'contains:lavanderia|bool','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'ar_condicionado','priority'=>'1','source_type'=>'xpath','selector_value'=>'//body//text()','selector_join'=>true,'pipeline'=>'contains:ar condicionado|bool','output_type'=>'bool','is_optional'=>true],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedDualImobiliria(): void
    {
        $id = DB::table('sitemap_agencies')->insertGetId([
            'name' => 'Dual Imobiliária',
            'domain' => 'dualimobiliaria.com.br',
            'sitemap_url' => 'https://dualimobiliaria.com.br/sitemap.xml',
            'allowed_url_patterns' => null,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'//span[contains(text(),"Tipo:")]/strong/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"price")]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'//i[contains(@class,"fa-map-marker-alt")]/following-sibling::text()','selector_join'=>false,'pipeline'=>'split:,:0|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'//i[contains(@class,"fa-map-marker-alt")]/following-sibling::text()','selector_join'=>false,'pipeline'=>'split:,:1|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'og','selector_value'=>'description','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'og','selector_value'=>'image','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'quartos','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"row") and contains(@class,"g-3")]//span[contains(text(),"Dormitórios")]/strong/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'suites','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"row") and contains(@class,"g-3")]//span[contains(text(),"Suite:")]/strong/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'banheiros','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"row") and contains(@class,"g-3")]//span[contains(text(),"Banheiros:")]/strong/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'vagas','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"row") and contains(@class,"g-3")]//span[contains(text(),"Vagas:")]/strong/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"row") and contains(@class,"g-3")]//span[contains(text(),"Área Interna:")]/strong/text()','selector_join'=>false,'pipeline'=>'regex:[\\d.,]+','output_type'=>'float','is_optional'=>true],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedECCorretoresdeImveis(): void
    {
        $id = DB::table('sitemap_agencies')->insertGetId([
            'name' => 'EC Corretores de Imóveis',
            'domain' => 'eccorretoresdeimoveis.com.br',
            'sitemap_url' => 'https://www.eccorretoresdeimoveis.com.br/sitemap.xml',
            'allowed_url_patterns' => '/imovel/',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'og','selector_value'=>'title','selector_join'=>false,'pipeline'=>'regex_group:^([^,]+) para:1','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'//*[contains(text(),"R\$")]/text()','selector_join'=>false,'pipeline'=>'regex:R\\\$\\s*[\\d.,]+','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'og','selector_value'=>'title','selector_join'=>false,'pipeline'=>'regex_group:bairro\\s*([^,]+):1','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'og','selector_value'=>'title','selector_join'=>false,'pipeline'=>'regex_group:,\\s*(.*?)\\s*/:1','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'xpath','selector_value'=>'//*[@class="descricao"]//text()','selector_join'=>true,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'og','selector_value'=>'image','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedEskalaImveis(): void
    {
        $id = DB::table('sitemap_agencies')->insertGetId([
            'name' => 'Eskala Imóveis',
            'domain' => 'eskalaimoveis.com.br',
            'sitemap_url' => 'https://eskalaimoveis.com.br/sitemap/buildings.xml',
            'allowed_url_patterns' => null,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="category"]//td[@class="Value"]//text()','selector_join'=>true,'pipeline'=>'split:»:-1|strip','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="Venda"]//span[contains(@class,"value")]//text()','selector_join'=>true,'pipeline'=>'strip','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'//td[contains(@class,"Label") and contains(text(),"Bairro")]/following-sibling::td[contains(@class,"Value")]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'//td[contains(@class,"Label") and contains(text(),"Cidade")]/following-sibling::td[contains(@class,"Value")]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'xpath','selector_value'=>'string(//div[contains(@class,"IMOVEL_DESC")]//div[contains(@class,"TextBox")])','selector_join'=>false,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'2','source_type'=>'og','selector_value'=>'description','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'og','selector_value'=>'image','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'quartos','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="bedroom"]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'regex:\\d+','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'suites','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="bedroom"]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'regex_group:sendo\\s+(\\d+)\\s+su[ií]te:1','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'banheiros','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="bathroom"]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'regex:\\d+','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'vagas','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="garage"]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'regex:\\d+','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"IMOVEL_MEDIDA")]//tr[@class="area_private"]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'replace:m²>|strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'mobiliado','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="furnishing"]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'contains:mobiliad|bool','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'aceita_permuta','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"IMOVEL_VALOR")]//div[contains(@class,"Aceita")]/text()','selector_join'=>true,'pipeline'=>'contains:permuta|bool','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'financiamento','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"IMOVEL_VALOR")]//div[contains(@class,"Aceita")]/text()','selector_join'=>true,'pipeline'=>'contains:financiamento|bool','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'piscina','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[contains(@class,"BoxCheckImovelDetalhes")]//li[contains(@class,"Piscina")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'churrasqueira','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[contains(@class,"BoxCheckImovelDetalhes")]//li[contains(@class,"Churrasqueira")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'academia','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[contains(@class,"BoxCheckImovelDetalhes")]//li[contains(@class,"Academia")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'salao_festas','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[contains(@class,"BoxCheckImovelDetalhes")]//li[contains(@class,"SalaoFestas")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'playground','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[contains(@class,"BoxCheckImovelDetalhes")]//li[contains(@class,"EspacoKids")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'sacada','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[contains(@class,"BoxCheckImovelDetalhes")]//li[contains(@class,"Sacada")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'lavanderia','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[contains(@class,"BoxCheckImovelDetalhes")]//li[contains(@class,"Lavanderia")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'elevador','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[contains(@class,"BoxCheckImovelDetalhes")]//li[contains(@class,"Elevador")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'portaria_24h','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[contains(@class,"BoxCheckImovelDetalhes")]//li[contains(@class,"Portaria24h")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedFraitagi(): void
    {
        $id = DB::table('sitemap_agencies')->insertGetId([
            'name' => 'Fraitagi',
            'domain' => 'fraitagimoveis.com.br',
            'sitemap_url' => 'https://fraitagimoveis.com.br/all_imoveis.xml',
            'allowed_url_patterns' => '/imovel/',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'og','selector_value'=>'title','selector_join'=>false,'pipeline'=>'split: :0|capitalize','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'//*[contains(text(),"R\$")]/text()','selector_join'=>true,'pipeline'=>'regex:R\\\$\\s*[\\d.,]+|max','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'og','selector_value'=>'title','selector_join'=>false,'pipeline'=>'regex_group:Bairro\\s+(.+)\$:1|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'og','selector_value'=>'title','selector_join'=>false,'pipeline'=>'regex_group:\\bem\\s+(.+?)\\s*-:1|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'og','selector_value'=>'description','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'xpath','selector_value'=>'//meta[@name="twitter:image"]/@content','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'2','source_type'=>'og','selector_value'=>'image','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedGirolla(): void
    {
        $id = DB::table('sitemap_agencies')->insertGetId([
            'name' => 'Girolla',
            'domain' => 'girolla.com.br',
            'sitemap_url' => 'https://www.girolla.com.br/sitemap.xml',
            'allowed_url_patterns' => '/imovel/',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'og','selector_value'=>'title','selector_join'=>false,'pipeline'=>'split: :0','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'//*[contains(text(),"R\$")]/text()','selector_join'=>false,'pipeline'=>'regex:R\\\$\\s*[\\d.,]+','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'og','selector_value'=>'title','selector_join'=>false,'pipeline'=>'split:-:1|split:,:0|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'og','selector_value'=>'title','selector_join'=>false,'pipeline'=>'split:-:1|split:,:1|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'og','selector_value'=>'description','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'og','selector_value'=>'image','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedImob(): void
    {
        $id = DB::table('sitemap_agencies')->insertGetId([
            'name' => 'Imob',
            'domain' => 'imobimobiliariasc.com.br',
            'sitemap_url' => 'https://imobimobiliariasc.com.br/sitemap.xml',
            'allowed_url_patterns' => null,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'//script[@type="application/ld+json"][contains(text(),"RealEstateListing")]/text()','selector_join'=>false,'pipeline'=>'regex_group:"name"\\s*:\\s*"([^"]+)":1','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'//script[@type="application/ld+json"][contains(text(),"RealEstateListing")]/text()','selector_join'=>false,'pipeline'=>'regex_group:"price"\\s*:\\s*"([^"]+)":1','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'//span[@class="districtAddress notranslate"]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'//span[@class="cityAddress notranslate"]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'xpath','selector_value'=>'//script[@type="application/ld+json"][contains(text(),"RealEstateListing")]/text()','selector_join'=>false,'pipeline'=>'regex_group:"description"\\s*:\\s*"([^"]+)":1','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'og','selector_value'=>'image','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'quartos','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"ImovelCaracteristica")]//tr[contains(@class,"bedroom")]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'suites','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"ImovelCaracteristica")]//tr[contains(@class,"bedroom")]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'regex_group:(\\d+)\\s*su[ií]te:1','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'banheiros','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"ImovelCaracteristica")]//tr[contains(@class,"bathroom")]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'vagas','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"ImovelCaracteristica")]//tr[contains(@class,"garage")]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"ImovelCaracteristica")]//tr[contains(@class,"area_private")]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'2','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"ImovelCaracteristica")]//tr[contains(@class,"area_total")]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'mobiliado','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"ImovelCaracteristica")]//tr[contains(@class,"furnishing")]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'contains:mobili|bool','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'aceita_permuta','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"Aceita")]/text()','selector_join'=>false,'pipeline'=>'contains:permuta|bool','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'financiamento','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"Aceita")]/text()','selector_join'=>false,'pipeline'=>'contains:financiamento|bool','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'piscina','priority'=>'1','source_type'=>'xpath','selector_value'=>'//li[contains(@class,"Piscina")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'churrasqueira','priority'=>'1','source_type'=>'xpath','selector_value'=>'//li[contains(@class,"Churrasqueira")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'salao_festas','priority'=>'1','source_type'=>'xpath','selector_value'=>'//li[contains(@class,"SalaodeFestas")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'sacada','priority'=>'1','source_type'=>'xpath','selector_value'=>'//li[contains(@class,"Sacada")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'lavanderia','priority'=>'1','source_type'=>'xpath','selector_value'=>'//li[contains(@class,"Lavanderia")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedImobiliriaGuarImveis(): void
    {
        $id = DB::table('sitemap_agencies')->insertGetId([
            'name' => 'Imobiliária Guará Imóveis',
            'domain' => 'imobiliariaguaraimoveis.com.br',
            'sitemap_url' => 'https://imobiliariaguaraimoveis.com.br/sitemap/buildings.xml',
            'allowed_url_patterns' => null,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'//meta[@name="keywords"]/@content','selector_join'=>false,'pipeline'=>'split:>:1|split:,:0|strip','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'//*[contains(@class,"ValorMoeda")]//text()','selector_join'=>true,'pipeline'=>'regex:R\\\$\\s*[\\d.,]+','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"ImovelCaracteristica")]//tr[contains(@class,"bedroom")]/td[@class="Value"]/text()','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'//title/text()','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'og','selector_value'=>'description','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'og','selector_value'=>'image','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'quartos','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"ImovelCaracteristica")]//tr[contains(@class,"bedroom")]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'clean_text','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'banheiros','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"ImovelCaracteristica")]//tr[contains(@class,"bathroom")]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'clean_text','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'vagas','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"ImovelCaracteristica")]//tr[contains(@class,"garage")]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'clean_text','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"ImovelCaracteristica")]//tr[contains(@class,"area_useful")]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'clean_text','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'2','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"ImovelCaracteristica")]//tr[contains(@class,"area_total")]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'clean_text','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'mobiliado','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"ImovelCaracteristica")]//tr[contains(@class,"furnishing")]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'contains:mobiliad|bool','output_type'=>'bool','is_optional'=>true],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedImobiliriaUrbana(): void
    {
        $id = DB::table('sitemap_agencies')->insertGetId([
            'name' => 'Imobiliária Urbana',
            'domain' => 'imobiliariaurbana.com.br',
            'sitemap_url' => 'https://imobiliariaurbana.com.br/sitemap.xml',
            'allowed_url_patterns' => '/imovel/',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'//li[contains(@class,"breadcrumb-item")][3]//text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'//h2[contains(text(),"R\$")]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'//p[contains(@class,"text-muted") and contains(.,"Código")]/text()','selector_join'=>true,'pipeline'=>'split:,:0|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'//p[contains(@class,"text-muted") and contains(.,"Código")]/text()','selector_join'=>true,'pipeline'=>'split:,:1|split:Código:0|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'xpath','selector_value'=>'//h3[contains(text(),"Descrição")]/following-sibling::p[1]//text()','selector_join'=>true,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"carousel-item")]//img/@src','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedImveisPlaneta(): void
    {
        $id = DB::table('sitemap_agencies')->insertGetId([
            'name' => 'Imóveis Planeta',
            'domain' => 'imoveisplaneta.com.br',
            'sitemap_url' => 'https://www.imoveisplaneta.com.br/sitemap.xml',
            'allowed_url_patterns' => '/imovel/',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'//title/text()','selector_join'=>false,'pipeline'=>'regex_group:^(.*?)\\s+em:1','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'//span[contains(text(),"R\$")]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'//title/text()','selector_join'=>false,'pipeline'=>'regex_group:,\\s+(.*?)\\s+-:1','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'//title/text()','selector_join'=>false,'pipeline'=>'regex_group:\\sem\\s(.*?),\\s:1','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'og','selector_value'=>'description','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'og','selector_value'=>'image','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedInovaEmpreendimentosImobiliarios(): void
    {
        $id = DB::table('sitemap_agencies')->insertGetId([
            'name' => 'Inova Empreendimentos Imobiliarios',
            'domain' => 'inovaempreendimento.com.br',
            'sitemap_url' => 'https://inovaempreendimento.com.br/sitemap.xml',
            'allowed_url_patterns' => '/imovel/',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'og','selector_value'=>'title','selector_join'=>false,'pipeline'=>'split: :0','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'//meta[@property="product:price:amount"]/@content','selector_join'=>false,'output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'//script[@id="__NEXT_DATA__"]/text()','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'//script[@id="__NEXT_DATA__"]/text()','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'og','selector_value'=>'description','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'og','selector_value'=>'image','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedItaivan(): void
    {
        $id = DB::table('sitemap_agencies')->insertGetId([
            'name' => 'Itaivan',
            'domain' => 'itaivan.com',
            'sitemap_url' => 'https://www.itaivan.com/sitemap.xml',
            'allowed_url_patterns' => null,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'og','selector_value'=>'title','pipeline'=>'split: :0','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'og','selector_value'=>'title','pipeline'=>'split:, :1 | split: - :0 | strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'2','source_type'=>'xpath','selector_value'=>'//ol[contains(@class, "breadcrumb")]//li//text()','pipeline'=>'split:|:-1 | strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'3','source_type'=>'xpath','selector_value'=>'//input[@id=\'NOME_LOCALIZACAO_BASE\']/@value','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'og','selector_value'=>'title','pipeline'=>'split: - :1 | split:/:0 | strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'2','source_type'=>'xpath','selector_value'=>'//input[@id=\'REGIAO_LOCALIZACAO_BASE\']/@value','pipeline'=>'replace: e Região> | strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'//h6[contains(@class, "preco-imovel")]/text()','pipeline'=>'strip','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'2','source_type'=>'xpath','selector_value'=>'//*[contains(@class, "preco-imovel")]/text()','pipeline'=>'strip','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'xpath','selector_value'=>'//p[contains(@class, "descricao")]/text()','pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'2','source_type'=>'og','selector_value'=>'description','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'og','selector_value'=>'image','output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'quartos','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class, "icon_detalhes")][.//img[contains(@src, "icon-bed.svg")]]/span[1]/text()','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'suites','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class, "icon_detalhes")][.//img[contains(@src, "icon-suites.svg")]]/span[1]/text()','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'banheiros','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class, "icon_detalhes")][.//img[contains(@src, "icon-shower.svg")]]/span[1]/text()','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'vagas','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class, "icon_detalhes")][.//img[contains(@src, "icon-garage.svg")]]/span[1]/text()','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class, "icon_detalhes")][.//img[contains(@src, "icon-area.svg")]]/span[1]/text()','output_type'=>'float','is_optional'=>true],
        ];
        foreach ($f as $x) $this->insertField($x);
        $this->insertField(['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'ar_condicionado','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[contains(@class, "lista-caracteristicas-extras")]/li[contains(@class, "extras-active")][contains(., "{name}")]','pipeline'=>'exists','output_type'=>'bool','is_optional'=>true,'selector_params'=>json_encode(['name' => 'Ar condicionado'])]);
        $this->insertField(['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'closet','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[contains(@class, "lista-caracteristicas-extras")]/li[contains(@class, "extras-active")][contains(., "{name}")]','pipeline'=>'exists','output_type'=>'bool','is_optional'=>true,'selector_params'=>json_encode(['name' => 'Closet'])]);
        $this->insertField(['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'escritorio','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[contains(@class, "lista-caracteristicas-extras")]/li[contains(@class, "extras-active")][contains(., "{name}")]','pipeline'=>'exists','output_type'=>'bool','is_optional'=>true,'selector_params'=>json_encode(['name' => 'Escritório'])]);
        $this->insertField(['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'portaria_24h','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[contains(@class, "lista-caracteristicas-extras")]/li[contains(@class, "extras-active")][contains(., "{name}")]','pipeline'=>'exists','output_type'=>'bool','is_optional'=>true,'selector_params'=>json_encode(['name' => 'Portaria 24 horas'])]);
        $this->insertField(['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'academia','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[contains(@class, "lista-caracteristicas-extras")]/li[contains(@class, "extras-active")][contains(., "{name}")]','pipeline'=>'exists','output_type'=>'bool','is_optional'=>true,'selector_params'=>json_encode(['name' => 'Academia'])]);
        $this->insertField(['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'churrasqueira','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[contains(@class, "lista-caracteristicas-extras")]/li[contains(@class, "extras-active")][contains(., "{name}")]','pipeline'=>'exists','output_type'=>'bool','is_optional'=>true,'selector_params'=>json_encode(['name' => 'Churrasqueira'])]);
        $this->insertField(['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'piscina','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[contains(@class, "lista-caracteristicas-extras")]/li[contains(@class, "extras-active")][contains(., "{name}")]','pipeline'=>'exists','output_type'=>'bool','is_optional'=>true,'selector_params'=>json_encode(['name' => 'Piscina'])]);
        $this->insertField(['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'salao_festas','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[contains(@class, "lista-caracteristicas-extras")]/li[contains(@class, "extras-active")][contains(., "{name}")]','pipeline'=>'exists','output_type'=>'bool','is_optional'=>true,'selector_params'=>json_encode(['name' => 'Salão de festas'])]);
        $this->insertField(['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'playground','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[contains(@class, "lista-caracteristicas-extras")]/li[contains(@class, "extras-active")][contains(., "{name}")]','pipeline'=>'exists','output_type'=>'bool','is_optional'=>true,'selector_params'=>json_encode(['name' => 'Playground'])]);
    }

    private function seedJaragu(): void
    {
        $id = DB::table('sitemap_agencies')->insertGetId([
            'name' => 'Jaraguá',
            'domain' => 'imobiliariajaragua.com.br',
            'sitemap_url' => 'https://www.imobiliariajaragua.com.br/sitemap.xml',
            'allowed_url_patterns' => null,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'//title/text()','selector_join'=>false,'pipeline'=>'split:à:0|strip','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'//h6[@class="preco-imovel"]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'2','source_type'=>'xpath','selector_value'=>'//p[@class="preco-imovel-mobile"]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'//title/text()','selector_join'=>false,'pipeline'=>'split:,:1|split:-:0|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'//title/text()','selector_join'=>false,'pipeline'=>'split:-:-1|split:/:0|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'xpath','selector_value'=>'//meta[@name="description"]/@content','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'og','selector_value'=>'image','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'quartos','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"icon_detalhes") and .//span[normalize-space()="Quartos"]]//span[1]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'suites','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"icon_detalhes") and .//span[normalize-space()="Suite"]]//span[1]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'banheiros','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"icon_detalhes") and .//span[normalize-space()="Banheiro"]]//span[1]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'vagas','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"icon_detalhes") and .//span[normalize-space()="Vagas"]]//span[1]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"icon_detalhes") and .//span[normalize-space()="Área Principal"]]//span[1]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedLeilaImoveis(): void
    {
        $id = DB::table('sitemap_agencies')->insertGetId([
            'name' => 'Leila Imoveis',
            'domain' => 'leilaimoveis.com.br',
            'sitemap_url' => 'https://leilaimoveis.com.br/sitemap.xml',
            'allowed_url_patterns' => '/imovel/',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'og','selector_value'=>'title','selector_join'=>false,'pipeline'=>'split:-:1|split:,:0|strip','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'//h3[contains(@class,"price")]//text()','selector_join'=>true,'pipeline'=>'regex:R\\\$\\s*[\\d.,]+','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'//*[@id="imovel-titulo"]/text()','selector_join'=>false,'pipeline'=>'split:,:1|split:-:0|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'//*[@id="imovel-titulo"]/text()','selector_join'=>false,'pipeline'=>'split:-:-1|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'og','selector_value'=>'description','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'og','selector_value'=>'image','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'1','source_type'=>'xpath','selector_value'=>'//*[contains(normalize-space(),"m²")]/text()','selector_join'=>false,'pipeline'=>'regex_group:(\\d+[.,]?\\d*)\\s*m²:1','output_type'=>'float','is_optional'=>true],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedMacro(): void
    {
        $id = DB::table('sitemap_agencies')->insertGetId([
            'name' => 'Macro',
            'domain' => 'macroimoveis.com',
            'sitemap_url' => 'https://macroimoveis.com/sitemap.xml',
            'allowed_url_patterns' => null,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="category"]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'split:»:-1|strip','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="Venda"]//span[@class="Valor"]/text()','selector_join'=>true,'pipeline'=>'strip','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'//td[text()="Bairro:"]/following-sibling::td[contains(@class,"Value")]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'//td[text()="Cidade:"]/following-sibling::td[contains(@class,"Value")]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'literal','selector_value'=>'-','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[@class="BoxGaleriaImovel"]//div[@class="fotorama"]//div[contains(@class,"ms-lightbox")]/@data-img','selector_join'=>false,'pipeline'=>'strip','output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'quartos','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="bedroom"]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'regex:\\d+','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'suites','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="bedroom"]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'regex_group:sendo\\s+(\\d+)\\s+suíte:1','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'banheiros','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="bathroom"]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'vagas','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="garage"]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="area_private"]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'2','source_type'=>'xpath','selector_value'=>'//tr[@class="area_total"]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'mobiliado','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="furnishing"]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'contains:mobiliado|bool','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'aceita_permuta','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="Venda"][contains(.,"Aceita-se: Permuta")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedMega(): void
    {
        $id = DB::table('sitemap_agencies')->insertGetId([
            'name' => 'Mega',
            'domain' => 'megaempreendimentos.com',
            'sitemap_url' => 'https://megaempreendimentos.com/sitemap/buildings.xml',
            'allowed_url_patterns' => null,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="category"]//td[@class="Value"]//text()','selector_join'=>true,'pipeline'=>'split:»:-1|strip','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="Venda"]//span[contains(@class,"value")]//text()','selector_join'=>true,'pipeline'=>'strip','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'//td[contains(@class,"Label") and contains(text(),"Bairro")]/following-sibling::td[contains(@class,"Value")]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'//td[contains(@class,"Label") and contains(text(),"Cidade")]/following-sibling::td[contains(@class,"Value")]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'og','selector_value'=>'description','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'og','selector_value'=>'image','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'quartos','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="bedroom"]//text()','selector_join'=>true,'pipeline'=>'regex:\\d+','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'suites','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="bedroom"]//text()','selector_join'=>true,'pipeline'=>'regex_group:sendo\\s+(\\d+):1','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'banheiros','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="bathroom"]//text()','selector_join'=>true,'pipeline'=>'regex:\\d+','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'vagas','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="garage"]//text()','selector_join'=>true,'pipeline'=>'regex:\\d+','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="area_private"]//text()','selector_join'=>true,'pipeline'=>'regex:\\d+','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'aceita_permuta','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="Venda"]//div[contains(@class,"Aceita")]/text()','selector_join'=>false,'pipeline'=>'contains:permuta|bool','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'financiamento','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="Venda"]//div[contains(@class,"Aceita")]/text()','selector_join'=>false,'pipeline'=>'contains:financiamento|bool','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'mobiliado','priority'=>'1','source_type'=>'xpath','selector_value'=>'//tr[@class="furnishing"]//text()','selector_join'=>true,'pipeline'=>'contains:mobiliado|bool','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'piscina','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[@class="BoxCheckImovelDetalhes"]//li[contains(@class,"Piscina")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'churrasqueira','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[@class="BoxCheckImovelDetalhes"]//li[contains(@class,"AreadeFestascomChurrasqueira")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'ar_condicionado','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[@class="BoxCheckImovelDetalhes"]//li[contains(@class,"ArCondicionado")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'closet','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ul[@class="BoxCheckImovelDetalhes"]//li[contains(@class,"Suitecomcloset")]','selector_join'=>false,'pipeline'=>'exists','output_type'=>'bool','is_optional'=>true],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedMillarImveis(): void
    {
        $id = DB::table('sitemap_agencies')->insertGetId([
            'name' => 'Millar Imóveis',
            'domain' => 'millarimoveis.com.br',
            'sitemap_url' => 'https://millarimoveis.com.br/sitemap.xml',
            'allowed_url_patterns' => null,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'normalize-space(//tr[contains(@class,"category")]/td[contains(@class,"Value")])','selector_join'=>false,'pipeline'=>'split:»:-1|strip','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'normalize-space((//div[contains(@class,"widget_valores_do_imovel")]//div[contains(@class,"LinhaValor")]//span[contains(@class,"value")])[1])','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'normalize-space(//div[contains(@class,"widget_localizacao_do_imovel")]//td[contains(@class,"Label") and contains(normalize-space(),"Bairro:")]/following-sibling::td[1])','selector_join'=>false,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'normalize-space(//div[contains(@class,"widget_localizacao_do_imovel")]//td[contains(@class,"Label") and contains(normalize-space(),"Cidade:")]/following-sibling::td[1])','selector_join'=>false,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'xpath','selector_value'=>'normalize-space((//div[contains(@class,"BoxImovelDesc")])[1])','selector_join'=>false,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'og','selector_value'=>'image','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'quartos','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"widget_caracteristicas_do_imovel")]//tr[contains(@class,"bedroom")]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'clean_text','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'banheiros','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"widget_caracteristicas_do_imovel")]//tr[contains(@class,"bathroom")]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'clean_text','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'vagas','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"widget_caracteristicas_do_imovel")]//tr[contains(@class,"garage")]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'clean_text','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"widget_medidas_do_imovel")]//tr[contains(@class,"area_useful")]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'clean_text','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'2','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"widget_medidas_do_imovel")]//tr[contains(@class,"area_total")]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'clean_text','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'mobiliado','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"widget_caracteristicas_do_imovel")]//tr[contains(@class,"furnishing")]/td[@class="Value"]/text()','selector_join'=>false,'pipeline'=>'contains:mobiliad|bool','output_type'=>'bool','is_optional'=>true],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedPradiSitemap(): void
    {
        $id = DB::table('sitemap_agencies')->insertGetId([
            'name' => 'Pradi',
            'domain' => 'imobiliariapradi.com.br',
            'sitemap_url' => 'https://www.imobiliariapradi.com.br/sitemap.xml',
            'allowed_url_patterns' => null,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ol[contains(@class,"breadcrumb")]//li/a/text()','selector_join'=>false,'output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'//span[contains(@class,"price-value--full")]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ol[contains(@class,"breadcrumb")]//li/a/text()','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'//ol[contains(@class,"breadcrumb")]//li/a/text()','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'xpath','selector_value'=>'//meta[@name="description"]/@content','selector_join'=>false,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'og','selector_value'=>'image','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedSingular(): void
    {
        $id = DB::table('sitemap_agencies')->insertGetId([
            'name' => 'Singular',
            'domain' => 'singular.imb.br',
            'sitemap_url' => 'https://singular.imb.br/sitemaps/propertys.xml',
            'allowed_url_patterns' => '/imovel/',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'og','selector_value'=>'title','selector_join'=>false,'pipeline'=>'split: :0|strip','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'//*[contains(text(),"R\$")]/text()','selector_join'=>true,'pipeline'=>'regex:R\\\$\\s*[\\d.,]+|max','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'//nav//a/text()','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'//nav//a/text()','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'og','selector_value'=>'description','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'og','selector_value'=>'image','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'quartos','priority'=>'1','source_type'=>'xpath','selector_value'=>'//script[@id="__NEXT_DATA__"]/text()','selector_join'=>false,'output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'suites','priority'=>'1','source_type'=>'xpath','selector_value'=>'//script[@id="__NEXT_DATA__"]/text()','selector_join'=>false,'output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'banheiros','priority'=>'1','source_type'=>'xpath','selector_value'=>'//script[@id="__NEXT_DATA__"]/text()','selector_join'=>false,'output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'vagas','priority'=>'1','source_type'=>'xpath','selector_value'=>'//script[@id="__NEXT_DATA__"]/text()','selector_join'=>false,'output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'1','source_type'=>'xpath','selector_value'=>'//script[@id="__NEXT_DATA__"]/text()','selector_join'=>false,'output_type'=>'float','is_optional'=>true],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedSmart(): void
    {
        $id = DB::table('sitemap_agencies')->insertGetId([
            'name' => 'Smart',
            'domain' => 'imbsmart.com.br',
            'sitemap_url' => 'https://imbsmart.com.br/sitemap/buildings.xml',
            'allowed_url_patterns' => null,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'xpath','selector_value'=>'normalize-space(//tr[contains(@class,"category")]/td[@class="Value"])','selector_join'=>false,'pipeline'=>'regex_group:»\\s*(.*):1|strip','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'2','source_type'=>'xpath','selector_value'=>'//script[@type="application/ld+json"]/text()','selector_join'=>false,'pipeline'=>'regex_group:"name"\\s*:\\s*"([^"]+)":1','output_type'=>'tipo','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'//script[@type="application/ld+json"]/text()','selector_join'=>false,'pipeline'=>'regex_group:"price"\\s*:\\s*"([^"]+)":1','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"ImovelLocalizacao")]//td[text()="Bairro:"]/following-sibling::td/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"ImovelLocalizacao")]//td[text()="Cidade:"]/following-sibling::td/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"ImovelDesc")]//div[@class="TextBox"]//p/text()','selector_join'=>true,'pipeline'=>'strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'og','selector_value'=>'image','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'quartos','priority'=>'1','source_type'=>'xpath','selector_value'=>'//span[contains(@class,"ResumoItem BEDROOM")]//span[@class="val"]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'suites','priority'=>'1','source_type'=>'xpath','selector_value'=>'//span[contains(@class,"ResumoItem SUITE")]//span[@class="val"]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'banheiros','priority'=>'1','source_type'=>'xpath','selector_value'=>'//span[contains(@class,"ResumoItem BATHROOM")]//span[@class="val"]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'vagas','priority'=>'1','source_type'=>'xpath','selector_value'=>'//span[contains(@class,"ResumoItem GARAGE")]//span[@class="val"]/text()','selector_join'=>false,'pipeline'=>'strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'1','source_type'=>'xpath','selector_value'=>'//span[contains(@class,"ResumoItem AREA_PRIVATE")]//span[@class="val"]/text()','selector_join'=>false,'pipeline'=>'replace:m²>|strip','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'churrasqueira','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"ImovelDesc")]//div[@class="TextBox"]//p/text()','selector_join'=>true,'pipeline'=>'contains:churrasqueira|bool','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'piscina','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"ImovelDesc")]//div[@class="TextBox"]//p/text()','selector_join'=>true,'pipeline'=>'contains:piscina|bool','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'aceita_permuta','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"ImovelDesc")]//div[@class="TextBox"]//p/text()','selector_join'=>true,'pipeline'=>'contains:permuta|bool','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'mobiliado','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"ImovelDesc")]//div[@class="TextBox"]//p/text()','selector_join'=>true,'pipeline'=>'contains:mobiliad|bool','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'lavanderia','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"ImovelDesc")]//div[@class="TextBox"]//p/text()','selector_join'=>true,'pipeline'=>'contains:lavanderia|bool','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'sacada','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"ImovelDesc")]//div[@class="TextBox"]//p/text()','selector_join'=>true,'pipeline'=>'contains:sacada|bool','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'ar_condicionado','priority'=>'1','source_type'=>'xpath','selector_value'=>'//div[contains(@class,"ImovelDesc")]//div[@class="TextBox"]//p/text()','selector_join'=>true,'pipeline'=>'contains:ar condicionado|bool','output_type'=>'bool','is_optional'=>true],
        ];
        foreach ($f as $x) $this->insertField($x);
    }

    private function seedguiaAzul(): void
    {
        $id = DB::table('sitemap_agencies')->insertGetId([
            'name' => 'Águia Azul',
            'domain' => 'aguiaazulimoveis.com.br',
            'sitemap_url' => 'https://www.aguiaazulimoveis.com.br/sitemap.xml',
            'allowed_url_patterns' => '/imoveis/',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $f = [
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'tipo','priority'=>'1','source_type'=>'og','selector_value'=>'title','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'valor','priority'=>'1','source_type'=>'xpath','selector_value'=>'//h2//span[contains(normalize-space(),"R\$")]/text()','selector_join'=>false,'pipeline'=>'regex:R\\\$\\s*[\\d.,]+','output_type'=>'float','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'bairro','priority'=>'1','source_type'=>'xpath','selector_value'=>'//title/text()','selector_join'=>false,'pipeline'=>'split:-:0|regex:^Ref\\.?\\s*\\d+\\s*-?\\s*|replace:- Aguia Azul Imóveis>|strip','output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'cidade','priority'=>'1','source_type'=>'og','selector_value'=>'description','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'descricao','priority'=>'1','source_type'=>'og','selector_value'=>'description','selector_join'=>false,'output_type'=>'text','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'imagem','priority'=>'1','source_type'=>'og','selector_value'=>'image','selector_join'=>false,'output_type'=>'url','is_optional'=>false],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'quartos','priority'=>'1','source_type'=>'og','selector_value'=>'description','selector_join'=>false,'pipeline'=>'regex_group:(\\d+)\\s*q[Uu]artos?:1','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'suites','priority'=>'1','source_type'=>'og','selector_value'=>'description','selector_join'=>false,'pipeline'=>'regex_group:(\\d+)\\s*s[uU][iIíÍ][tT][eE][sS]?:1','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'banheiros','priority'=>'1','source_type'=>'og','selector_value'=>'description','selector_join'=>false,'pipeline'=>'regex_group:(\\d+)\\s*banheiros?:1','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'vagas','priority'=>'1','source_type'=>'og','selector_value'=>'description','selector_join'=>false,'pipeline'=>'regex_group:(\\d+)\\s*vagas?:1','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'area','priority'=>'1','source_type'=>'og','selector_value'=>'description','selector_join'=>false,'pipeline'=>'regex_group:(\\d+(?:[.,]\\d+)?)\\s*m[²2]:1','output_type'=>'float','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'churrasqueira','priority'=>'1','source_type'=>'og','selector_value'=>'description','selector_join'=>false,'pipeline'=>'contains:churrasqueira|bool','output_type'=>'bool','is_optional'=>true],
            ['agency_type'=>'sitemap','agency_id'=>$id,'field_name'=>'lavanderia','priority'=>'1','source_type'=>'og','selector_value'=>'description','selector_join'=>false,'pipeline'=>'contains:lavanderia|bool','output_type'=>'bool','is_optional'=>true],
        ];
        foreach ($f as $x) $this->insertField($x);
    }
}
