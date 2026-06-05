<?php

namespace App\Http\Resources\Concerns;

use Illuminate\Support\Facades\Storage;

/**
 * Shared, privacy-aware presentation for public property payloads (ADR-0002).
 *
 * Internal fields never appear here. Exact address and price are gated:
 * - show_exact_address = false -> street/number/complement omitted and
 *   coordinates coarsened (rounded ~1km) so the precise point can't be read
 *   off the wire.
 * - show_price = false -> price omitted.
 */
trait PublicPropertyPresentation
{
    protected function imageUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        return filter_var($path, FILTER_VALIDATE_URL) ? $path : Storage::disk('public')->url($path);
    }

    protected function coverImageUrl(): ?string
    {
        $cover = $this->images?->firstWhere('is_cover', true) ?? $this->images?->first();

        return $cover ? $this->imageUrl($cover->path) : null;
    }

    protected function publicPricing(): array
    {
        $showPrice = (bool) $this->show_price;

        return [
            'show_price' => $showPrice,
            'sale_price' => $showPrice ? $this->sale_price : null,
            'rent_price' => $showPrice ? $this->rent_price : null,
            'accepts_financing' => (bool) $this->accepts_financing,
            'accepts_exchange' => (bool) $this->accepts_exchange,
        ];
    }

    protected function publicLocation(): array
    {
        $showAddress = (bool) $this->show_exact_address;

        return array_filter([
            'state' => $this->state,
            'city' => $this->city,
            'neighborhood' => $this->neighborhood,
            'street' => $showAddress ? $this->street : null,
            'number' => $showAddress ? $this->number : null,
            'complement' => $showAddress ? $this->complement : null,
            'latitude' => $this->publicCoordinate($this->latitude),
            'longitude' => $this->publicCoordinate($this->longitude),
            'show_exact_address' => $showAddress,
        ], fn ($value) => $value !== null);
    }

    /**
     * Exact value when the address is public; otherwise rounded to ~1km so the
     * approximate-area map cannot be reverse-engineered to the exact point.
     */
    protected function publicCoordinate($value): ?float
    {
        if ($value === null) {
            return null;
        }

        return (bool) $this->show_exact_address ? (float) $value : round((float) $value, 2);
    }
}
