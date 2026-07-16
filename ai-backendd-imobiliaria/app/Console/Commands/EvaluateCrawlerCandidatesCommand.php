<?php

namespace App\Console\Commands;

use App\Models\CrawlerRun;
use App\Services\Crawler\CrawlRunPublicationService;
use Illuminate\Console\Command;

class EvaluateCrawlerCandidatesCommand extends Command
{
    protected $signature = 'crawler:evaluate-candidates';

    protected $description = 'Evaluate completed candidate crawl snapshots against their pinned quality policy';

    public function handle(CrawlRunPublicationService $publication): int
    {
        CrawlRun::query()
            ->where('publication_state', 'candidate')
            ->whereNotNull('completed_at')
            ->orderBy('id')
            ->each(fn (CrawlerRun $run) => $publication->evaluate($run));

        return self::SUCCESS;
    }
}
