<?php

namespace Database\Seeders;

use App\Models\Agency;
use App\Models\AgencyDomain;
use App\Models\AgencySiteSettings;
use App\Models\Property;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AgencyDemoSeeder extends Seeder
{
    public function run(): void
    {
        // ── Agency ──────────────────────────────────────────────────────
        $agency = Agency::create([
            'name' => 'Imobiliária Demo',
            'slug' => 'demo',
        ]);

        // ── Owner (admin user for this agency) ─────────────────────────
        $owner = User::create([
            'name' => 'Admin Demo',
            'email' => 'admin@demo.localhost',
            'username' => 'demoadmin',
            'phone' => '(47) 99999-0001',
            'person_type' => 'F',
            'is_active' => true,
            'password' => Hash::make('password'),
            'agency_id' => $agency->id,
        ]);

        $agency->update(['owner_user_id' => $owner->id]);

        // ── Brokers ────────────────────────────────────────────────────
        $broker1 = User::create([
            'name' => 'João Corretor',
            'email' => 'joao@demo.localhost',
            'username' => 'joaocorretor',
            'phone' => '(47) 99999-0002',
            'creci' => 'CRECI-SC 12345-F',
            'person_type' => 'F',
            'is_active' => true,
            'show_on_website' => true,
            'has_broker_page' => true,
            'password' => Hash::make('password'),
            'agency_id' => $agency->id,
        ]);

        $broker2 = User::create([
            'name' => 'Maria Imóveis',
            'email' => 'maria@demo.localhost',
            'username' => 'mariaimoveis',
            'phone' => '(47) 99999-0003',
            'creci' => 'CRECI-SC 67890-F',
            'person_type' => 'F',
            'is_active' => true,
            'show_on_website' => true,
            'has_broker_page' => true,
            'password' => Hash::make('password'),
            'agency_id' => $agency->id,
        ]);

        // ── Domain ─────────────────────────────────────────────────────
        AgencyDomain::create([
            'agency_id' => $agency->id,
            'hostname' => 'demo.localhost',
            'is_primary' => true,
        ]);

        // ── Site Settings / Branding ───────────────────────────────────
        AgencySiteSettings::create([
            'agency_id' => $agency->id,
            'theme_slug' => 'classic',
            'logo_path' => null,
            'favicon_path' => null,
            'color_primary' => '#1e3a8a',
            'color_secondary' => '#0ea5e9',
            'color_accent' => '#f59e0b',
            'color_bg' => '#ffffff',
            'color_surface' => '#f8fafc',
            'color_text' => '#0f172a',
            'color_muted' => '#64748b',
            'default_whatsapp' => '(47) 99999-0001',
            'facebook_url' => 'https://facebook.com/imobiliariademo',
            'instagram_url' => 'https://instagram.com/imobiliariademo',
            'hero_title' => 'Encontre o imóvel dos seus sonhos',
            'hero_subtitle' => 'Os melhores imóveis de Itajaí e região.',
            'about_text' => 'A Imobiliária Demo atua há mais de 10 anos no mercado imobiliário de Itajaí e região, oferecendo as melhores oportunidades de compra, venda e locação.',
        ]);

        // ── Properties ─────────────────────────────────────────────────
        $properties = [
            [
                'reference_code' => 'DEMO-AP1001',
                'title' => 'Apartamento amplo no Centro',
                'description' => 'Lindo apartamento de 3 quartos no coração de Itajaí. Sala ampla, cozinha planejada, suíte master com closet. Prédio com piscina, academia e salão de festas.',
                'property_type' => 'apartamento',
                'purpose' => 'venda',
                'city' => 'Itajaí',
                'neighborhood' => 'Centro',
                'street' => 'Rua XV de Novembro',
                'number' => '450',
                'latitude' => -26.9075,
                'longitude' => -48.6625,
                'show_exact_address' => true,
                'sale_price' => 550000,
                'show_price' => true,
                'usable_area' => 95,
                'total_area' => 120,
                'bedrooms' => 3,
                'suites' => 1,
                'bathrooms' => 2,
                'garage_spaces' => 2,
                'floor_number' => 8,
                'total_floors' => 15,
                'build_year' => 2019,
                'is_highlighted' => true,
                'is_published' => true,
                'broker_id' => $broker1->id,
            ],
            [
                'reference_code' => 'DEMO-CS2001',
                'title' => 'Casa térrea com piscina',
                'description' => 'Excelente casa térrea em condomínio fechado. 4 quartos, 3 suítes, piscina privativa, churrasqueira e jardim. Segurança 24h.',
                'property_type' => 'casa',
                'purpose' => 'venda',
                'city' => 'Itajaí',
                'neighborhood' => 'Praia Brava',
                'street' => 'Rua dos Coqueiros',
                'number' => '120',
                'latitude' => -26.9200,
                'longitude' => -48.6350,
                'show_exact_address' => false,
                'sale_price' => 1200000,
                'show_price' => true,
                'usable_area' => 220,
                'total_area' => 450,
                'bedrooms' => 4,
                'suites' => 3,
                'bathrooms' => 4,
                'garage_spaces' => 3,
                'is_highlighted' => true,
                'is_published' => true,
                'broker_id' => $broker2->id,
            ],
            [
                'reference_code' => 'DEMO-AP1002',
                'title' => 'Apartamento mobiliado à beira-mar',
                'description' => 'Apartamento totalmente mobiliado e decorado na orla da praia. Vista panorâmica para o mar, 2 quartos, varanda gourmet.',
                'property_type' => 'apartamento',
                'purpose' => 'locacao',
                'city' => 'Balneário Camboriú',
                'neighborhood' => 'Centro',
                'latitude' => -26.9900,
                'longitude' => -48.6350,
                'show_exact_address' => true,
                'rent_price' => 3500,
                'show_price' => true,
                'usable_area' => 75,
                'bedrooms' => 2,
                'suites' => 1,
                'bathrooms' => 2,
                'garage_spaces' => 1,
                'floor_number' => 12,
                'total_floors' => 25,
                'is_highlighted' => true,
                'is_published' => true,
                'broker_id' => $broker1->id,
            ],
            [
                'reference_code' => 'DEMO-TE3001',
                'title' => 'Terreno plano em loteamento',
                'description' => 'Terreno plano de 360m² em loteamento nobre. Documentação em ordem, pronto para construir. Próximo a escolas, mercados e shopping.',
                'property_type' => 'terreno',
                'purpose' => 'venda',
                'city' => 'Itajaí',
                'neighborhood' => 'São Vicente',
                'latitude' => -26.8950,
                'longitude' => -48.6750,
                'show_exact_address' => false,
                'sale_price' => 280000,
                'show_price' => true,
                'usable_area' => 360,
                'total_area' => 360,
                'bedrooms' => 0,
                'bathrooms' => 0,
                'garage_spaces' => 0,
                'is_highlighted' => false,
                'is_published' => true,
                'broker_id' => $broker2->id,
            ],
            [
                'reference_code' => 'DEMO-AP1003',
                'title' => 'Cobertura duplex com vista',
                'description' => 'Cobertura duplex de alto padrão com 4 suítes, living integrado, terraço com piscina privativa e churrasqueira. 3 vagas de garagem.',
                'property_type' => 'apartamento',
                'purpose' => 'venda',
                'city' => 'Itajaí',
                'neighborhood' => 'Fazenda',
                'latitude' => -26.9150,
                'longitude' => -48.6550,
                'show_exact_address' => true,
                'sale_price' => 1800000,
                'show_price' => false,
                'usable_area' => 280,
                'total_area' => 350,
                'bedrooms' => 4,
                'suites' => 4,
                'bathrooms' => 5,
                'garage_spaces' => 3,
                'floor_number' => 20,
                'total_floors' => 20,
                'is_highlighted' => true,
                'is_published' => true,
                'broker_id' => $broker1->id,
            ],
            [
                'reference_code' => 'DEMO-CS2002',
                'title' => 'Sobrado geminado novo',
                'description' => 'Sobrado geminado recém-construído. 3 quartos, sala 2 ambientes, cozinha americana, lavanderia e quintal. Aceita financiamento.',
                'property_type' => 'casa',
                'purpose' => 'venda',
                'city' => 'Itajaí',
                'neighborhood' => 'Cordeiros',
                'latitude' => -26.8850,
                'longitude' => -48.6900,
                'show_exact_address' => true,
                'sale_price' => 380000,
                'show_price' => true,
                'accepts_financing' => true,
                'usable_area' => 110,
                'total_area' => 150,
                'bedrooms' => 3,
                'suites' => 1,
                'bathrooms' => 2,
                'garage_spaces' => 1,
                'is_highlighted' => false,
                'is_published' => true,
                'broker_id' => $broker2->id,
            ],
            [
                'reference_code' => 'DEMO-AP1004',
                'title' => 'Kitnet compacta no centro',
                'description' => 'Kitnet ideal para solteiros ou casal. Prédio com portaria, lavanderia coletiva e bicicletário. Ótima localização.',
                'property_type' => 'apartamento',
                'purpose' => 'locacao',
                'city' => 'Itajaí',
                'neighborhood' => 'Centro',
                'latitude' => -26.9080,
                'longitude' => -48.6600,
                'show_exact_address' => true,
                'rent_price' => 1200,
                'show_price' => true,
                'usable_area' => 35,
                'bedrooms' => 1,
                'bathrooms' => 1,
                'garage_spaces' => 0,
                'floor_number' => 3,
                'is_highlighted' => false,
                'is_published' => true,
                'broker_id' => $broker1->id,
            ],
            [
                'reference_code' => 'DEMO-CS2003',
                'title' => 'Casa de praia à venda',
                'description' => 'Casa de praia com 5 quartos, piscina, deck e acesso direto à areia. Perfeita para temporada ou aluguel por temporada.',
                'property_type' => 'casa',
                'purpose' => 'venda',
                'city' => 'Balneário Camboriú',
                'neighborhood' => 'Praia Central',
                'latitude' => -26.9850,
                'longitude' => -48.6300,
                'show_exact_address' => false,
                'sale_price' => 2500000,
                'show_price' => true,
                'usable_area' => 300,
                'total_area' => 600,
                'bedrooms' => 5,
                'suites' => 4,
                'bathrooms' => 6,
                'garage_spaces' => 4,
                'is_highlighted' => true,
                'is_published' => true,
                'broker_id' => $broker2->id,
            ],
        ];

        foreach ($properties as &$data) {
            $data['agency_id'] = $agency->id;
            $data['state'] = 'SC';
            $data['status'] = 'disponivel';
            $data['zip_code'] = $data['zip_code'] ?? '88301-000';
            $data['street'] = $data['street'] ?? 'Rua Exemplo';
            $data['number'] = $data['number'] ?? '100';
        }
        unset($data); // break the reference — classic PHP foreach gotcha

        foreach ($properties as $data) {
            Property::create($data);
        }
    }
}
