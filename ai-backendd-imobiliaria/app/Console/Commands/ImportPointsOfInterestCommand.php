<?php

namespace App\Console\Commands;

use App\Services\Overpass\OverpassPoiImporter;
use Illuminate\Console\Command;

class ImportPointsOfInterestCommand extends Command
{
    protected $signature = 'pois:import
        {--city= : City name to import}
        {--state= : Brazilian state UF, for example SC}';

    protected $description = 'Import points of interest and neighborhood reference points from Overpass API.';

    public function handle(OverpassPoiImporter $importer): int
    {
        $city = trim((string) ($this->option('city') ?: config('overpass.default_city')));
        $state = trim((string) ($this->option('state') ?: config('overpass.default_state')));

        if ($city === '' || $state === '') {
            $this->error('City and state are required.');

            return self::FAILURE;
        }

        $this->info("Importing POIs for {$city}/{$state} from Overpass...");

        try {
            $summary = $importer->import($city, $state);
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->info(sprintf(
            'Imported %d POIs and %d neighborhood reference points. Skipped %d elements.',
            $summary['pois'],
            $summary['neighborhoods'],
            $summary['skipped'],
        ));

        return self::SUCCESS;
    }
}
