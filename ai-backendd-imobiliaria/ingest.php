<?php

use App\Http\Controllers\Api\Crawler\AuctionIngestionController;
use Illuminate\Http\Request;

$jsonPath = 'auctions_real.json';
$data = json_decode(file_get_contents($jsonPath), true);

if (!$data) {
    echo "No data found or invalid JSON.\n";
    exit;
}

$controller = new AuctionIngestionController();
$agencyId = \App\Models\Crawler\CrawlAgency::first()->id ?? 57;
$count = 0;

foreach ($data as $item) {
    $item['crawl_agency_id'] = $agencyId;
    $request = new Request();
    $request->merge($item);
    
    try {
        $controller->store($request);
        echo "Inserted: " . $item['source']['external_id'] . "\n";
        $count++;
    } catch (\Exception $e) {
        echo "Error inserting " . $item['source']['external_id'] . ": " . $e->getMessage() . "\n";
    }
}

echo "Done! Inserted $count properties.\n";
