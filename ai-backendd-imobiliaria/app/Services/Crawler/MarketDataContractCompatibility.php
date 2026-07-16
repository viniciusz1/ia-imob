<?php

namespace App\Services\Crawler;

class MarketDataContractCompatibility
{
    /**
     * @param  list<array{name: string, type: string, required: bool}>  $current
     * @param  list<array{name: string, type: string, required: bool}>  $candidate
     */
    public function classify(array $current, array $candidate): string
    {
        $currentByName = collect($current)->keyBy('name');
        $candidateByName = collect($candidate)->keyBy('name');

        foreach ($currentByName as $name => $field) {
            $next = $candidateByName->get($name);

            if ($next === null
                || $next['type'] !== $field['type']
                || ($field['required'] === false && $next['required'] === true)) {
                return 'incompatible';
            }
        }

        foreach ($candidateByName as $name => $field) {
            if (! $currentByName->has($name) && $field['required'] === true) {
                return 'incompatible';
            }
        }

        return 'additive_optional';
    }
}
