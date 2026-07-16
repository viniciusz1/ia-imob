<?php

namespace App\Services\Crawler;

use App\Models\Crawler\QualityPolicyVersion;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class QualityPolicyService
{
    public function create(array $rules, User $user): QualityPolicyVersion
    {
        return DB::transaction(function () use ($rules, $user): QualityPolicyVersion {
            DB::statement('SELECT pg_advisory_xact_lock(?)', [804106]);

            return QualityPolicyVersion::query()->create([
                'version' => ((int) QualityPolicyVersion::query()->max('version')) + 1,
                'status' => 'draft',
                'rules' => $rules,
                'created_by' => $user->id,
            ]);
        });
    }

    public function validate(QualityPolicyVersion $policy): QualityPolicyVersion
    {
        if ($policy->status !== 'draft') {
            throw ValidationException::withMessages(['status' => 'Only draft policies can enter validation.']);
        }
        $policy->update(['status' => 'validating']);

        return $policy->refresh();
    }

    public function activate(QualityPolicyVersion $policy, User $user): QualityPolicyVersion
    {
        if ($policy->status !== 'validating') {
            throw ValidationException::withMessages(['status' => 'Only validating policies can be activated.']);
        }
        $policy->update(['status' => 'active', 'activated_by' => $user->id, 'activated_at' => now()]);

        return $policy->refresh();
    }
}
