<?php

namespace App\Domain\Analytics;

enum PriceMetric: string
{
    case AnnouncedPrice = 'announced_price';
    case PricePerSquareMetre = 'price_per_square_metre';
}
