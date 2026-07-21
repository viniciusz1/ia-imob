<?php

namespace App\Console\Commands;

use App\Services\Crawler\CrawlRunPublicationService;
use Illuminate\Console\Command;

class EvaluateCrawlerCandidatesCommand extends Command
{
    protected $signature = 'crawler:evaluate-candidates';

    protected $description = 'Evaluate completed candidate crawl snapshots against their pinned quality policy';

    public function handle(CrawlRunPublicationService $publication): int
    {
        \App\Models\CrawlerRun::query()
            ->where('publication_state', 'candidate')
            ->whereNotNull('completed_at')
            ->orderBy('id')
            ->each(fn (\App\Models\CrawlerRun $run) => $publication->evaluate($run));

        return self::SUCCESS;
    }
}
