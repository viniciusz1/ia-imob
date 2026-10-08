<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\Crawler\AuctionIngestionController;

class AuctionSeeder extends Seeder
{
    public function run(): void
    {
        $mockData = [
            [
                "domain" => "auction",
                "source" => [
                  "external_id" => "26.093-1",
                  "canonical_url" => "https://www.leiloeiropublico.com.br/ListagemLote.aspx?Leilao=26093&Lote=1",
                ],
                "event" => [
                  "title" => "Leilão Judicial da 1ª Vara Cível da Comarca de Jaraguá do Sul",
                  "sale_modality" => "judicial",
                  "status" => "open",
                  "auctioneer_name" => "Gabriel Damiani",
                  "seller_or_court" => "1ª Vara Cível - TJSC Jaraguá do Sul",
                  "published_at" => "2026-08-20T10:00:00-03:00",
                ],
                "property" => [
                  "lot_number" => "1",
                  "property_type" => "house",
                  "city" => "Jaraguá do Sul",
                  "state" => "SC",
                  "title" => "Casa de Alvenaria 180m² - Bairro Barra do Rio Cerro",
                  "description" => "Uma casa residencial em alvenaria com área privativa de 180,00 m², terreno de 360,00 m², situada na Rua Feliciano Bortolini, 450, Barra do Rio Cerro, Jaraguá do Sul/SC. Matrícula nº 14.520 do CRI de Jaraguá do Sul.",
                  "address" => "Rua Feliciano Bortolini, 450",
                  "neighborhood" => "Barra do Rio Cerro",
                  "postal_code" => "89260-000",
                  "built_area_m2" => 180.0,
                  "land_area_m2" => 360.0,
                  "occupancy_status" => "occupied",
                  "registration_number" => "14520",
                ],
                "rounds" => [
                  [
                    "round_number" => 1,
                    "starts_at" => "2026-09-15T14:00:00-03:00",
                    "appraisal_value" => 450000.0,
                    "minimum_bid" => 450000.0,
                    "current_bid" => null,
                    "commission_rate" => 5.0,
                    "status" => "scheduled",
                    "source_label" => "1ª Praça",
                  ],
                  [
                    "round_number" => 2,
                    "starts_at" => "2026-09-29T14:00:00-03:00",
                    "appraisal_value" => 450000.0,
                    "minimum_bid" => 270000.0,
                    "current_bid" => null,
                    "commission_rate" => 5.0,
                    "status" => "scheduled",
                    "source_label" => "2ª Praça (40% OFF)",
                  ],
                ],
                "evidence" => [
                  [
                    "kind" => "detail",
                    "url" => "https://www.leiloeiropublico.com.br/ListagemLote.aspx?Leilao=26093&Lote=1",
                  ],
                  [
                    "kind" => "notice",
                    "url" => "https://www.leiloeiropublico.com.br/editais/2026/Edital_26093_Jaragua.pdf",
                  ],
                  [
                    "kind" => "photo",
                    "url" => "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80",
                  ],
                ],
              ],
              [
                "domain" => "auction",
                "source" => [
                  "external_id" => "1444408138240",
                  "canonical_url" => "https://venda-imoveis.caixa.gov.br/sistema/detalhe-imovel.asp?hdnID=1444408138240",
                ],
                "event" => [
                  "title" => "2º Leilão SFI - CAIXA Econômica Federal",
                  "sale_modality" => "extrajudicial",
                  "status" => "open",
                  "auctioneer_name" => "Caixa Econômica Federal",
                  "seller_or_court" => "Caixa Econômica Federal - EMGEA",
                  "published_at" => "2026-08-25T08:00:00-03:00",
                ],
                "property" => [
                  "lot_number" => "1",
                  "property_type" => "apartment",
                  "city" => "Jaraguá do Sul",
                  "state" => "SC",
                  "title" => "Apartamento 62m² - Vila Nova, Jaraguá do Sul",
                  "description" => "Apartamento nº 302, Bloco B, Residencial das Flores, com 62,50 m² de área privativa, 2 quartos, sala, cozinha, BDI. Rua Reinoldo Rau, 120, Vila Nova. Matrícula 32104.",
                  "address" => "Rua Reinoldo Rau, 120",
                  "neighborhood" => "Vila Nova",
                  "postal_code" => "89252-001",
                  "built_area_m2" => 62.5,
                  "land_area_m2" => null,
                  "occupancy_status" => "occupied",
                  "registration_number" => "32104",
                ],
                "rounds" => [
                  [
                    "round_number" => 2,
                    "starts_at" => "2026-09-22T10:00:00-03:00",
                    "appraisal_value" => 290000.0,
                    "minimum_bid" => 174000.0,
                    "current_bid" => null,
                    "commission_rate" => null,
                    "status" => "open",
                    "source_label" => "2º Leilão SFI (Desconto 40%)",
                  ],
                ],
                "evidence" => [
                  [
                    "kind" => "detail",
                    "url" => "https://venda-imoveis.caixa.gov.br/sistema/detalhe-imovel.asp?hdnID=1444408138240",
                  ],
                  [
                    "kind" => "notice",
                    "url" => "https://venda-imoveis.caixa.gov.br/editais/SC/1444408138240_edital.pdf",
                  ],
                  [
                    "kind" => "photo",
                    "url" => "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
                  ],
                ],
              ],
              [
                "domain" => "auction",
                "source" => [
                  "external_id" => "8555523412001",
                  "canonical_url" => "https://venda-imoveis.caixa.gov.br/sistema/detalhe-imovel.asp?hdnID=8555523412001",
                ],
                "event" => [
                  "title" => "Licitação Aberta 0021/2026 - CAIXA",
                  "sale_modality" => "administrative",
                  "status" => "open",
                  "auctioneer_name" => "Caixa Econômica Federal",
                  "seller_or_court" => "Caixa Econômica Federal",
                  "published_at" => "2026-08-28T09:00:00-03:00",
                ],
                "property" => [
                  "lot_number" => "1",
                  "property_type" => "land",
                  "city" => "Guaramirim",
                  "state" => "SC",
                  "title" => "Terreno 450m² - Bairro Bananal do Sul, Guaramirim/SC",
                  "description" => "Lote de terras sob nº 12 da Quadra C, Loteamento Vale Verde, área total de 450,00 m², situado na Rua 28 de Agosto. Pronto para construir.",
                  "address" => "Rua 28 de Agosto, s/n",
                  "neighborhood" => "Bananal do Sul",
                  "postal_code" => "89270-000",
                  "built_area_m2" => null,
                  "land_area_m2" => 450.0,
                  "occupancy_status" => "vacant",
                  "registration_number" => "8912",
                ],
                "rounds" => [
                  [
                    "round_number" => 1,
                    "starts_at" => "2026-09-18T14:00:00-03:00",
                    "appraisal_value" => 180000.0,
                    "minimum_bid" => 110000.0,
                    "current_bid" => null,
                    "commission_rate" => null,
                    "status" => "open",
                    "source_label" => "Licitação Aberta 0021/2026",
                  ],
                ],
                "evidence" => [
                  [
                    "kind" => "detail",
                    "url" => "https://venda-imoveis.caixa.gov.br/sistema/detalhe-imovel.asp?hdnID=8555523412001",
                  ],
                  [
                    "kind" => "notice",
                    "url" => "https://venda-imoveis.caixa.gov.br/editais/SC/8555523412001_edital.pdf",
                  ],
                  [
                    "kind" => "photo",
                    "url" => "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80",
                  ],
                ],
              ],
              [
                "domain" => "auction",
                "source" => [
                  "external_id" => "27.102-2",
                  "canonical_url" => "https://www.leiloeiropublico.com.br/ListagemLote.aspx?Leilao=27102&Lote=2",
                ],
                "event" => [
                  "title" => "Leilão Extrajudicial de Imóveis Cooperativa de Crédito",
                  "sale_modality" => "extrajudicial",
                  "status" => "open",
                  "auctioneer_name" => "Juliana Santos",
                  "seller_or_court" => "Ailos / Viacredi",
                  "published_at" => "2026-08-15T15:00:00-03:00",
                ],
                "property" => [
                  "lot_number" => "2",
                  "property_type" => "commercial",
                  "city" => "Schroeder",
                  "state" => "SC",
                  "title" => "Sala Comercial 95m² - Centro, Schroeder/SC",
                  "description" => "Sala comercial térrea nº 01 do Edifício Comercial Schroeder, com 95,00 m² de área privativa, localizada na Rua Marechal Castelo Branco, 1500. Excelente ponto comercial.",
                  "address" => "Rua Marechal Castelo Branco, 1500",
                  "neighborhood" => "Centro",
                  "postal_code" => "89275-000",
                  "built_area_m2" => 95.0,
                  "land_area_m2" => null,
                  "occupancy_status" => "vacant",
                  "registration_number" => "5421",
                ],
                "rounds" => [
                  [
                    "round_number" => 1,
                    "starts_at" => "2026-09-10T15:00:00-03:00",
                    "appraisal_value" => 320000.0,
                    "minimum_bid" => 320000.0,
                    "current_bid" => null,
                    "commission_rate" => 5.0,
                    "status" => "closed",
                    "source_label" => "1ª Praça",
                  ],
                  [
                    "round_number" => 2,
                    "starts_at" => "2026-09-24T15:00:00-03:00",
                    "appraisal_value" => 320000.0,
                    "minimum_bid" => 195000.0,
                    "current_bid" => null,
                    "commission_rate" => 5.0,
                    "status" => "scheduled",
                    "source_label" => "2ª Praça (39% OFF)",
                  ],
                ],
                "evidence" => [
                  [
                    "kind" => "detail",
                    "url" => "https://www.leiloeiropublico.com.br/ListagemLote.aspx?Leilao=27102&Lote=2",
                  ],
                  [
                    "kind" => "notice",
                    "url" => "https://www.leiloeiropublico.com.br/editais/Edital_Viacredi_Schroeder.pdf",
                  ],
                  [
                    "kind" => "photo",
                    "url" => "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
                  ],
                ],
              ],
              [
                "domain" => "auction",
                "source" => [
                  "external_id" => "1444409991234",
                  "canonical_url" => "https://venda-imoveis.caixa.gov.br/sistema/detalhe-imovel.asp?hdnID=1444409991234",
                ],
                "event" => [
                  "title" => "Venda Direta Online - CAIXA Econômica Federal",
                  "sale_modality" => "direct_sale",
                  "status" => "open",
                  "auctioneer_name" => "Caixa Econômica Federal",
                  "seller_or_court" => "Caixa Econômica Federal",
                  "published_at" => "2026-09-01T08:00:00-03:00",
                ],
                "property" => [
                  "lot_number" => "1",
                  "property_type" => "house",
                  "city" => "Corupá",
                  "state" => "SC",
                  "title" => "Casa 110m² - Bairro Seminário, Corupá/SC",
                  "description" => "Casa com 3 quartos, sala, cozinha, banheiro, área total construída de 110,00 m², terreno de 300,00 m², Rua Francisco Mees, 210. Oportunidade de compra direta.",
                  "address" => "Rua Francisco Mees, 210",
                  "neighborhood" => "Seminário",
                  "postal_code" => "89278-000",
                  "built_area_m2" => 110.0,
                  "land_area_m2" => 300.0,
                  "occupancy_status" => "occupied",
                  "registration_number" => "21980",
                ],
                "rounds" => [
                  [
                    "round_number" => 1,
                    "starts_at" => "2026-09-05T08:00:00-03:00",
                    "appraisal_value" => 240000.0,
                    "minimum_bid" => 135000.0,
                    "current_bid" => null,
                    "commission_rate" => null,
                    "status" => "open",
                    "source_label" => "Venda Direta Online (43% OFF)",
                  ],
                ],
                "evidence" => [
                  [
                    "kind" => "detail",
                    "url" => "https://venda-imoveis.caixa.gov.br/sistema/detalhe-imovel.asp?hdnID=1444409991234",
                  ],
                  [
                    "kind" => "notice",
                    "url" => "https://venda-imoveis.caixa.gov.br/editais/SC/1444409991234_edital.pdf",
                  ],
                  [
                    "kind" => "photo",
                    "url" => "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
                  ],
                ],
              ],
              [
                "domain" => "auction",
                "source" => [
                  "external_id" => "28.100-1",
                  "canonical_url" => "https://www.leiloeiropublico.com.br/DetalheLote.aspx?Leilao=28100&Lote=1",
                ],
                "event" => [
                  "title" => "Leilão Judicial da 2ª Vara Cível de Jaraguá do Sul",
                  "sale_modality" => "judicial",
                  "status" => "open",
                  "auctioneer_name" => "Gabriel Damiani",
                  "seller_or_court" => "2ª Vara Cível - TJSC Jaraguá do Sul",
                  "published_at" => "2026-09-02T11:00:00-03:00",
                ],
                "property" => [
                  "lot_number" => "1",
                  "property_type" => "house",
                  "city" => "Jaraguá do Sul",
                  "state" => "SC",
                  "title" => "Residência de Alto Padrão 240m² - Ilha da Figueira",
                  "description" => "Ampla residência em alvenaria com 240m² de área construída, 3 suítes, piscina, área gourmet, terreno plano de 520m² na Rua José Theodoro Ribeiro.",
                  "address" => "Rua José Theodoro Ribeiro, 1800",
                  "neighborhood" => "Ilha da Figueira",
                  "postal_code" => "89258-001",
                  "built_area_m2" => 240.0,
                  "land_area_m2" => 520.0,
                  "occupancy_status" => "vacant",
                  "registration_number" => "29810",
                ],
                "rounds" => [
                  [
                    "round_number" => 1,
                    "starts_at" => "2026-09-18T14:00:00-03:00",
                    "appraisal_value" => 780000.0,
                    "minimum_bid" => 780000.0,
                    "current_bid" => null,
                    "commission_rate" => 5.0,
                    "status" => "scheduled",
                    "source_label" => "1ª Praça",
                  ],
                  [
                    "round_number" => 2,
                    "starts_at" => "2026-10-02T14:00:00-03:00",
                    "appraisal_value" => 780000.0,
                    "minimum_bid" => 468000.0,
                    "current_bid" => null,
                    "commission_rate" => 5.0,
                    "status" => "scheduled",
                    "source_label" => "2ª Praça (40% OFF)",
                  ],
                ],
                "evidence" => [
                  [
                    "kind" => "detail",
                    "url" => "https://www.leiloeiropublico.com.br/DetalheLote.aspx?Leilao=28100&Lote=1",
                  ],
                  [
                    "kind" => "notice",
                    "url" => "https://www.leiloeiropublico.com.br/editais/2026/Edital_Leilao_28100.pdf",
                  ],
                  [
                    "kind" => "photo",
                    "url" => "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
                  ],
                ],
              ],
        ];

        $controller = new AuctionIngestionController();
        $agencyId = \App\Models\Crawler\CrawlAgency::first()->id ?? 57;

        foreach ($mockData as $item) {
            $item['crawl_agency_id'] = $agencyId;
            $request = new Request();
            $request->merge($item);
            
            try {
                $controller->store($request);
                $this->command->info("Mock inserted: " . $item['source']['external_id']);
            } catch (\Exception $e) {
                $this->command->error("Error inserting " . $item['source']['external_id'] . ": " . $e->getMessage());
            }
        }
    }
}
