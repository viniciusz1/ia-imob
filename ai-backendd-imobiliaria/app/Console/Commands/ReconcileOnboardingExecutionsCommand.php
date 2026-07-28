<?php

namespace App\Console\Commands;

use App\Services\Crawler\OnboardingExecutionCoordinator;
use Illuminate\Console\Command;

class ReconcileOnboardingExecutionsCommand extends Command
{
    protected $signature = 'crawler:reconcile-onboarding-executions';

    protected $description = 'Advance automated onboarding executions whose current operation has finished';

    public function handle(OnboardingExecutionCoordinator $coordinator): int
    {
        $this->info(sprintf(
            '%d onboarding execution(s) reconciled.',
            $coordinator->reconcilePending(),
        ));

        return self::SUCCESS;
    }
}
