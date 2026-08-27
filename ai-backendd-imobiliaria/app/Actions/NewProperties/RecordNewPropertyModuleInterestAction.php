<?php

declare(strict_types=1);

namespace App\Actions\NewProperties;

use App\Models\NewPropertyModuleInterest;
use App\Models\User;

class RecordNewPropertyModuleInterestAction
{
    /**
     * @param  array{intended_uses: array<int, string>, notes?: string|null}  $input
     */
    public function execute(User $user, array $input): NewPropertyModuleInterest
    {
        return NewPropertyModuleInterest::query()->updateOrCreate(
            [
                'agency_id' => $user->agency_id,
                'user_id' => $user->id,
            ],
            [
                'intended_uses' => $input['intended_uses'],
                'notes' => $input['notes'] ?? null,
            ],
        );
    }
}
