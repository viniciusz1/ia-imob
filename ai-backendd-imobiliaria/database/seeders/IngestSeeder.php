<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\Crawler\AuctionIngestionController;

class IngestSeeder extends Seeder
{
    public function run()
    {
        $jsonPath = base_path('auctions_real.json');
        if (!file_exists($jsonPath)) {
            $this->command->error("No auctions_real.json found!");
            return;
        }

        $data = json_decode(file_get_contents($jsonPath), true);
        if (!$data) {
            $this->command->error("Invalid JSON.");
            return;
        }

        $controller = new AuctionIngestionController();
        $agencyId = \App\Models\Crawler\CrawlAgency::first()->id ?? 57;

        $count = 0;
        foreach ($data as $item) {
            $item['crawl_agency_id'] = $agencyId;
            $item['domain'] = 'auction';
            $request = new Request();
            $request->merge($item);
            
            try {
                $controller->store($request);
                $this->command->info("Inserted: " . $item['source']['external_id']);
                $count++;
            } catch (\Exception $e) {
                $this->command->error("Error inserting " . $item['source']['external_id'] . ": " . $e->getMessage());
            }
        }
        
        $this->command->info("Done! Inserted $count properties.");
    }
}
