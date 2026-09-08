<?php

namespace App\Repositories\Analytics;

use App\Domain\Analytics\MarketAnalyticsFilters;
use App\Domain\Analytics\PriceMetric;
use App\Domain\Analytics\PropertyTypeNormalizer;
use App\Domain\Analytics\SupplyDimension;
use App\Domain\Analytics\SupplyField;
use App\Models\MarketProperty;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Database\Query\Builder as BuilderContract;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\JoinClause;

class MarketStockQuery
{
    public const PROPERTIES = 'crawler.market_properties';

    public const RUN = 'analytics_run';

    public const AGENCY = 'analytics_agency';

    public const BEDROOM_LAST_BUCKET = 5;

    public const PARKING_LAST_BUCKET = 3;

    private const COLUMNS = [
        SupplyField::Price->value => 'valor',
        SupplyField::Area->value => 'area',
        SupplyField::Type->value => 'tipo',
        SupplyField::City->value => 'cidade',
        SupplyField::Neighbourhood->value => 'bairro',
        SupplyField::Bedrooms->value => 'quartos',
        SupplyField::Suites->value => 'suites',
        SupplyField::Bathrooms->value => 'banheiros',
        SupplyField::ParkingSpaces->value => 'vagas',
        SupplyField::ConstructionYear->value => 'ano_construcao',
        SupplyField::ListingUrl->value => 'link_imovel',
    ];

    /**
     * @var array<string, string>|null
     */
    private ?array $canonicalTypes = null;

    public function stock(MarketAnalyticsFilters $filters): Builder
    {
        $query = MarketProperty::query()
            ->latestRun()
            ->join('crawler.crawl_runs as '.self::RUN, function (JoinClause $join): void {
                $join->on(self::RUN.'.id', '=', self::PROPERTIES.'.crawler_run_id')
                    ->where(self::RUN.'.publication_state', 'published');
            })
            ->join('crawler.crawl_agencies as '.self::AGENCY, self::AGENCY.'.id', '=', self::RUN.'.crawl_agency_id');

        $this->applyFilters($query, $filters);

        return $query;
    }

    public function priced(MarketAnalyticsFilters $filters): Builder
    {
        return $this->stock($filters)->where($this->column(SupplyField::Price), '>', 0);
    }

    public function pricedWithArea(MarketAnalyticsFilters $filters): Builder
    {
        return $this->priced($filters)->where($this->column(SupplyField::Area), '>', 0);
    }

    public function forMetric(MarketAnalyticsFilters $filters, PriceMetric $metric): Builder
    {
        return $metric === PriceMetric::PricePerSquareMetre
            ? $this->pricedWithArea($filters)
            : $this->priced($filters);
    }

    public function column(SupplyField $field): string
    {
        return self::PROPERTIES.'.'.self::COLUMNS[$field->value];
    }

    public function dimension(SupplyDimension $dimension): string
    {
        return match ($dimension) {
            SupplyDimension::Agency => self::AGENCY.'.name',
            SupplyDimension::City => $this->column(SupplyField::City),
            SupplyDimension::Neighbourhood => $this->column(SupplyField::Neighbourhood),
            SupplyDimension::Type => $this->column(SupplyField::Type),
            SupplyDimension::Bedrooms => $this->column(SupplyField::Bedrooms),
            SupplyDimension::ParkingSpaces => $this->column(SupplyField::ParkingSpaces),
        };
    }

    public function metric(PriceMetric $metric): string
    {
        return match ($metric) {
            PriceMetric::AnnouncedPrice => $this->column(SupplyField::Price),
            PriceMetric::PricePerSquareMetre => $this->column(SupplyField::Price).' / '.$this->column(SupplyField::Area),
        };
    }

    public function referenceDate(MarketAnalyticsFilters $filters): ?CarbonImmutable
    {
        $latest = $this->stock($filters)->max(self::RUN.'.published_at');

        return $latest === null
            ? null
            : CarbonImmutable::parse($latest)->setTimezone(MarketAnalyticsFilters::TIMEZONE);
    }

    /**
     * @return array<string, string>
     */
    public function canonicalTypes(): array
    {
        if ($this->canonicalTypes !== null) {
            return $this->canonicalTypes;
        }

        $rawTypes = $this->stock(MarketAnalyticsFilters::fromArray([]))
            ->whereNotNull($this->column(SupplyField::Type))
            ->distinct()
            ->pluck($this->column(SupplyField::Type))
            ->all();

        return $this->canonicalTypes = PropertyTypeNormalizer::map($rawTypes);
    }

    /**
     * @param  list<string>  $canonicalNames
     * @return list<string>
     */
    public function rawTypesFor(array $canonicalNames): array
    {
        return array_values(array_keys(array_filter(
            $this->canonicalTypes(),
            static fn (string $canonical): bool => in_array($canonical, $canonicalNames, true),
        )));
    }

    private function applyFilters(Builder $query, MarketAnalyticsFilters $filters): void
    {
        $query
            ->when($filters->from, fn (Builder $q, CarbonImmutable $from) => $q->where(self::RUN.'.completed_at', '>=', $from->startOfDay()))
            ->when($filters->to, fn (Builder $q, CarbonImmutable $to) => $q->where(self::RUN.'.completed_at', '<=', $to->endOfDay()))
            ->when($filters->city, fn (Builder $q, string $city) => $q->where($this->column(SupplyField::City), $city))
            ->when($filters->minPrice, fn (Builder $q, float $min) => $q->where($this->column(SupplyField::Price), '>=', $min))
            ->when($filters->maxPrice, fn (Builder $q, float $max) => $q->where($this->column(SupplyField::Price), '<=', $max))
            ->when($filters->minArea, fn (Builder $q, float $min) => $q->where($this->column(SupplyField::Area), '>=', $min))
            ->when($filters->maxArea, fn (Builder $q, float $max) => $q->where($this->column(SupplyField::Area), '<=', $max));

        if ($filters->neighbourhoods !== []) {
            $query->whereIn($this->column(SupplyField::Neighbourhood), $filters->neighbourhoods);
        }

        if ($filters->agencies !== []) {
            $query->whereIn(self::AGENCY.'.name', $filters->agencies);
        }

        if ($filters->types !== []) {
            $query->whereIn($this->column(SupplyField::Type), $this->rawTypesFor($filters->types));
        }

        $this->applyBuckets($query, SupplyField::Bedrooms, $filters->bedrooms, self::BEDROOM_LAST_BUCKET);
        $this->applyBuckets($query, SupplyField::ParkingSpaces, $filters->parkingSpaces, self::PARKING_LAST_BUCKET);
    }

    /**
     * @param  list<int>  $selected
     */
    private function applyBuckets(Builder $query, SupplyField $field, array $selected, int $lastBucket): void
    {
        if ($selected === []) {
            return;
        }

        $column = $this->column($field);
        $exact = array_values(array_filter($selected, static fn (int $value): bool => $value < $lastBucket));
        $openEnded = in_array($lastBucket, $selected, true);

        $query->where(function (BuilderContract $group) use ($column, $exact, $openEnded, $lastBucket): void {
            if ($exact !== []) {
                $group->whereIn($column, $exact);
            }

            if ($openEnded) {
                $group->orWhere($column, '>=', $lastBucket);
            }
        });
    }
}
