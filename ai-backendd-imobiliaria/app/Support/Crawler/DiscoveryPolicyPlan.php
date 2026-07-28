<?php

namespace App\Support\Crawler;

use App\Models\Crawler\DiscoveryPolicyVersion;

final class DiscoveryPolicyPlan
{
    public static function fromVersion(
        DiscoveryPolicyVersion $policy,
        string $source,
    ): array {
        return [
            'id' => $policy->id,
            'name' => $policy->name,
            'version' => $policy->version,
            'source' => $source,
            'strategies' => $policy->strategies,
            'sources' => $policy->strategies,
            'configuration' => $policy->configuration,
        ];
    }
}
