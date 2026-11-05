<?php

namespace Database\Seeders;

use App\Models\Agency;
use App\Models\Crawler\CrawlAgency;
use App\Models\CrawlerRun;
use App\Models\MarketProperty;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class RentalValuationDemoSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment('local')) {
            throw new RuntimeException('Esta demonstração só pode ser criada no ambiente local.');
        }

        DB::transaction(function (): void {
            $agency = Agency::firstOrCreate(['slug' => 'valuation-demo'], [
                'name' => 'DEMO — Avaliação de imóveis',
                'is_active' => true,
            ]);

            $user = User::firstOrCreate(['email' => 'avaliacao@demo.localhost'], [
                'agency_id' => $agency->id,
                'name' => 'Demonstração de avaliação',
                'username' => 'avaliacao-demo',
                'phone' => '(00) 00000-0000',
                'person_type' => 'F',
                'is_active' => true,
                'password' => Hash::make('AvaliacaoDemo123!'),
            ]);

            if ($user->agency_id !== $agency->id) {
                throw new RuntimeException('O e-mail da demonstração já pertence a outra imobiliária.');
            }

            $user->givePermissionTo(['valuations.create', 'valuations.view']);

            $crawlAgency = CrawlAgency::firstOrCreate(['slug' => 'valuation-demo'], [
                'name' => 'DEMO — Comparáveis fictícios',
                'base_url' => 'https://valuation-demo.invalid',
                'root_domain' => 'valuation-demo.invalid',
                'lifecycle_state' => 'active',
            ]);

            if ($crawlAgency->current_published_crawl_run_id !== null) {
                return;
            }

            $run = CrawlerRun::factory()->create([
                'crawl_agency_id' => $crawlAgency->id,
                'raw_count' => 5,
                'normalized_count' => 5,
            ]);

            foreach ([2000, 2200, 2400, 2600, 2800] as $index => $rent) {
                MarketProperty::factory()->create([
                    'crawler_run_id' => $run->id,
                    'tipo' => 'Casa',
                    'cidade' => 'Cidade Demonstração',
                    'bairro' => 'Bairro Demonstração',
                    'quartos' => 3,
                    'banheiros' => 2,
                    'vagas' => 1,
                    'area' => 100,
                    'valor' => 500000 + ($index * 50000),
                    'valor_aluguel' => $rent,
                    'descricao' => 'Dado fictício para demonstração local da avaliação. Não é anúncio real.',
                    'link_imovel' => 'https://valuation-demo.invalid/imovel/'.($index + 1),
                    'imagem' => null,
                ]);
            }
        });

        $this->command?->info('Demonstração local disponível: avaliacao@demo.localhost / AvaliacaoDemo123!');
        $this->command?->info('Cidade Demonstração, Bairro Demonstração: casa, 120 m², 3 quartos, 2 banheiros, 1 vaga.');
    }
}
