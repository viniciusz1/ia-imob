<?php

namespace App\Console\Commands;

use App\Models\CrawlerRun;
use App\Services\Crawler\CrawlRunPublicationService;
use Illuminate\Console\Command;
use Throwable;

class EvaluateCrawlerCandidatesCommand extends Command
{
    protected $signature = 'crawler:evaluate-candidates';

    protected $description = 'Evaluate completed candidate crawl snapshots against their pinned quality policy';

    public function handle(CrawlRunPublicationService $publication): int
    {
        $failed = false;

        CrawlerRun::query()
            ->where('publication_state', 'candidate')
            ->whereNotNull('completed_at')
            ->orderBy('id')
            ->each(function (CrawlerRun $run) use (&$failed, $publication): void {
                try {
                    $publication->evaluate($run);
                } catch (Throwable $exception) {
                    $failed = true;
                    $this->error("Quality evaluation failed for Candidate Snapshot #{$run->id}: {$exception->getMessage()}");
                }
            });

        return $failed ? self::FAILURE : self::SUCCESS;
    }
}
