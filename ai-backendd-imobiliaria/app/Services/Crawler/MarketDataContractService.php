<?php

namespace App\Services\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\ExtractionProfile;
use App\Models\Crawler\MarketDataContractVersion;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MarketDataContractService
{
    public function __construct(private readonly MarketDataContractCompatibility $compatibility) {}

    public function createDraft(array $fields, User $actor): MarketDataContractVersion
    {
        return DB::transaction(function () use ($fields, $actor): MarketDataContractVersion {
            DB::statement("SELECT pg_advisory_xact_lock(hashtext('crawler.market_data_contract_versions'))");
            $version = ((int) MarketDataContractVersion::query()->max('version')) + 1;

            return MarketDataContractVersion::query()->create([
                'version' => $version,
                'status' => 'draft',
                'fields' => $fields,
                'affected_agency_ids' => [],
                'created_by' => $actor->id,
            ])->refresh();
        });
    }

    public function validate(MarketDataContractVersion $contract): MarketDataContractVersion
    {
        if ($contract->status !== 'draft') {
            throw ValidationException::withMessages(['status' => 'Only draft contracts can be validated.']);
        }

        $current = MarketDataContractVersion::query()->where('status', 'active')->first();
        $compatibility = $current === null
            ? 'additive_optional'
            : $this->compatibility->classify($current->fields, $contract->fields);
        $affectedIds = $compatibility === 'incompatible'
            ? CrawlAgency::query()->pluck('id')->all()
            : [];

        $contract->update([
            'status' => 'validating',
            'compatibility' => $compatibility,
            'affected_agency_ids' => $affectedIds,
        ]);

        return $contract->refresh();
    }

    public function activate(MarketDataContractVersion $contract, User $actor): MarketDataContractVersion
    {
        if ($contract->status !== 'validating') {
            throw ValidationException::withMessages(['status' => 'Only validated contracts can be activated.']);
        }

        return DB::transaction(function () use ($contract, $actor): MarketDataContractVersion {
            DB::statement("SELECT pg_advisory_xact_lock(hashtext('crawler.market_data_contract_versions'))");
            MarketDataContractVersion::query()
                ->where('status', 'active')
                ->update(['status' => 'superseded']);

            $contract->update([
                'status' => 'active',
                'activated_by' => $actor->id,
                'activated_at' => now(),
            ]);

            if ($contract->compatibility === 'incompatible') {
                CrawlAgency::query()
                    ->whereIn('id', $contract->affected_agency_ids)
                    ->update(['revalidation_required' => true]);
                ExtractionProfile::query()
                    ->whereIn('crawl_agency_id', $contract->affected_agency_ids)
                    ->whereIn('status', ['candidate', 'approved', 'active'])
                    ->update(['status' => 'revalidation_required']);
            }

            return $contract->refresh();
        });
    }
}
