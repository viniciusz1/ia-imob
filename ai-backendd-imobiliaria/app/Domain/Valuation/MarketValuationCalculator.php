<?php

namespace App\Domain\Valuation;

use App\Models\PropertyValuation;
use App\Models\ScrapyProperty;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

final class MarketValuationCalculator
{
    private const MIN_SAMPLE = 5;

    private const MAX_SAMPLE = 30;

    private const MAX_CANDIDATES = 50;

    private const FLOOD_ADJUSTMENT_PERCENT = 30;

    public function comparableCandidates(ValuationInput $input): array
    {
        $exact = $this->collectComparableCandidates($input, false);
        $candidates = $exact['valid'];

        if ($candidates->count() < self::MAX_CANDIDATES) {
            $relaxed = $this->collectComparableCandidates($input, true);

            $candidates = $candidates
                ->merge($relaxed['valid'])
                ->unique('scrapy_property_id')
                ->values();
        }

        return $candidates
            ->sortBy(fn (array $comparable) => abs($comparable['area'] - $input->area))
            ->take(self::MAX_CANDIDATES)
            ->values()
            ->map(fn (array $comparable): array => $comparable + ['review_status' => 'pending'])
            ->all();
    }

    public function calculate(ValuationInput $input): MarketValuationResult
    {
        $exact = $this->collectComparableCandidates($input, false);
        $relaxed = false;
        $candidates = $exact;

        if ($exact['valid']->count() < self::MIN_SAMPLE) {
            $candidates = $this->collectComparableCandidates($input, true);
            $relaxed = true;
        }

        if ($candidates['valid']->count() < self::MIN_SAMPLE) {
            return new MarketValuationResult(
                PropertyValuation::STATUS_INSUFFICIENT_SAMPLE,
                null,
                null,
                null,
                [
                    'total_found' => $candidates['total_found'],
                    'invalid_count' => $candidates['invalid_count'],
                    'outlier_count' => 0,
                    'used_count' => 0,
                    'bathrooms_relaxed' => $relaxed,
                    'minimum_required' => self::MIN_SAMPLE,
                ],
                [],
            );
        }

        $closest = $candidates['valid']
            ->sortBy(fn (array $comparable) => abs($comparable['area'] - $input->area))
            ->take(self::MAX_SAMPLE)
            ->values();

        $trimmed = $this->trimOutliers($closest);
        $sample = $trimmed['sample'];

        $pricesPerSquareMeter = $sample
            ->pluck('price_per_square_meter')
            ->sort()
            ->values()
            ->all();

        $baseRange = [
            'min' => $this->percentile($pricesPerSquareMeter, 0.25) * $input->area,
            'central' => $this->percentile($pricesPerSquareMeter, 0.50) * $input->area,
            'max' => $this->percentile($pricesPerSquareMeter, 0.75) * $input->area,
        ];

        $adjustmentPercent = $input->floodRisk ? self::FLOOD_ADJUSTMENT_PERCENT : null;
        $finalRange = $adjustmentPercent === null
            ? $baseRange
            : array_map(
                fn (float $value): float => $value * ((100 - $adjustmentPercent) / 100),
                $baseRange
            );

        return new MarketValuationResult(
            PropertyValuation::STATUS_CALCULATED,
            $baseRange,
            $finalRange,
            $adjustmentPercent,
            [
                'total_found' => $candidates['total_found'],
                'invalid_count' => $candidates['invalid_count'],
                'outlier_count' => $trimmed['outlier_count'],
                'used_count' => $sample->count(),
                'bathrooms_relaxed' => $relaxed,
                'minimum_required' => self::MIN_SAMPLE,
            ],
            $sample->values()->all(),
        );
    }

    public function calculateReviewed(ValuationInput $input, array $reviews): MarketValuationResult
    {
        $candidates = collect($this->comparableCandidates($input));
        $reviewMap = collect($reviews)
            ->mapWithKeys(fn (array $review): array => [(int) $review['scrapy_property_id'] => $review['status']]);

        $candidateIds = $candidates
            ->pluck('scrapy_property_id')
            ->map(fn (int $id): int => $id)
            ->sort()
            ->values()
            ->all();

        $reviewIds = $reviewMap
            ->keys()
            ->map(fn (int $id): int => $id)
            ->sort()
            ->values()
            ->all();

        if ($candidateIds !== $reviewIds) {
            throw ValidationException::withMessages([
                'comparable_reviews' => 'Todos os candidatos comparáveis devem ser revisados antes do cálculo.',
            ]);
        }

        $reviewed = $candidates
            ->map(function (array $candidate) use ($reviewMap): array {
                $id = (int) $candidate['scrapy_property_id'];

                return array_merge($candidate, ['review_status' => $reviewMap->get($id)]);
            })
            ->values();

        $approved = $reviewed
            ->where('review_status', 'approved')
            ->values();

        if ($approved->isEmpty()) {
            throw ValidationException::withMessages([
                'comparable_reviews' => 'A avaliação precisa de pelo menos um comparável válido.',
            ]);
        }

        $pricesPerSquareMeter = $approved
            ->pluck('price_per_square_meter')
            ->sort()
            ->values()
            ->all();

        $baseRange = [
            'min' => $this->percentile($pricesPerSquareMeter, 0.25) * $input->area,
            'central' => $this->percentile($pricesPerSquareMeter, 0.50) * $input->area,
            'max' => $this->percentile($pricesPerSquareMeter, 0.75) * $input->area,
        ];

        $adjustmentPercent = $input->floodRisk ? self::FLOOD_ADJUSTMENT_PERCENT : null;
        $finalRange = $adjustmentPercent === null
            ? $baseRange
            : array_map(
                fn (float $value): float => $value * ((100 - $adjustmentPercent) / 100),
                $baseRange
            );

        return new MarketValuationResult(
            PropertyValuation::STATUS_CALCULATED,
            $baseRange,
            $finalRange,
            $adjustmentPercent,
            [
                'total_found' => $candidates->count(),
                'invalid_count' => 0,
                'outlier_count' => 0,
                'used_count' => $approved->count(),
                'approved_count' => $approved->count(),
                'rejected_count' => $reviewed->where('review_status', 'rejected')->count(),
                'minimum_required' => 1,
            ],
            $reviewed->all(),
        );
    }

    private function collectComparableCandidates(ValuationInput $input, bool $relaxBathrooms): array
    {
        $cities = array_map(
            static fn (string $city): string => TextNormalizer::normalize($city),
            $input->city
        );

        $neighborhoods = array_map(
            static fn (string $neighborhood): string => TextNormalizer::normalize($neighborhood),
            $input->neighborhood
        );

        $properties = ScrapyProperty::query()
            ->where('quartos', $input->bedrooms)
            ->where('vagas', $input->garageSpaces)
            ->get();

        $matched = $properties->filter(function (ScrapyProperty $property) use ($input, $cities, $neighborhoods, $relaxBathrooms): bool {
            if (! in_array(TextNormalizer::normalize((string) $property->cidade), $cities, true)) {
                return false;
            }

            if (! in_array(TextNormalizer::normalize((string) $property->bairro), $neighborhoods, true)) {
                return false;
            }

            if (ResidentialType::fromScrapedType($property->tipo) !== $input->residentialType) {
                return false;
            }

            $bathrooms = (int) $property->banheiros;

            if ($relaxBathrooms) {
                return abs($bathrooms - $input->bathrooms) <= 1;
            }

            return $bathrooms === $input->bathrooms;
        })->values();

        $valid = $matched
            ->toBase()
            ->map(fn (ScrapyProperty $property): ?array => $this->toComparableEvidence($property))
            ->filter()
            ->values();

        return [
            'total_found' => $matched->count(),
            'invalid_count' => $matched->count() - $valid->count(),
            'valid' => $valid,
        ];
    }

    private function toComparableEvidence(ScrapyProperty $property): ?array
    {
        $price = (float) $property->valor;
        $area = (float) $property->area;
        $bedrooms = (int) $property->quartos;
        $bathrooms = (int) $property->banheiros;
        $garageSpaces = (int) $property->vagas;

        if ($price < 50000 || $price > 100000000 || $area < 20 || $area > 2000) {
            return null;
        }

        if ($bedrooms < 0 || $bedrooms > 10 || $bathrooms < 0 || $bathrooms > 10 || $garageSpaces < 0 || $garageSpaces > 10) {
            return null;
        }

        return [
            'scrapy_property_id' => $property->id,
            'residential_type' => ResidentialType::fromScrapedType($property->tipo),
            'raw_type' => $property->tipo,
            'city' => $property->cidade,
            'neighborhood' => $property->bairro,
            'bedrooms' => $bedrooms,
            'bathrooms' => $bathrooms,
            'garage_spaces' => $garageSpaces,
            'area' => $area,
            'price' => $price,
            'price_per_square_meter' => $price / $area,
            'agency' => $property->imobiliaria,
            'link' => $property->link_imovel,
        ];
    }

    private function trimOutliers(Collection $sample): array
    {
        $trimCount = (int) floor($sample->count() * 0.10);

        if ($trimCount < 1 || ($sample->count() - ($trimCount * 2)) < self::MIN_SAMPLE) {
            return [
                'sample' => $sample,
                'outlier_count' => 0,
            ];
        }

        $trimmed = $sample
            ->sortBy('price_per_square_meter')
            ->slice($trimCount, $sample->count() - ($trimCount * 2))
            ->values();

        return [
            'sample' => $trimmed,
            'outlier_count' => $sample->count() - $trimmed->count(),
        ];
    }

    private function percentile(array $sortedValues, float $percentile): float
    {
        $count = count($sortedValues);

        if ($count === 0) {
            return 0.0;
        }

        $index = ($count - 1) * $percentile;
        $lower = (int) floor($index);
        $upper = (int) ceil($index);

        if ($lower === $upper) {
            return (float) $sortedValues[$lower];
        }

        $weight = $index - $lower;

        return ((float) $sortedValues[$lower] * (1 - $weight)) + ((float) $sortedValues[$upper] * $weight);
    }
}
