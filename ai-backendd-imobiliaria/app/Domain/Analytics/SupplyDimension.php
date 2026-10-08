<?php

namespace App\Domain\Analytics;

enum SupplyDimension: string
{
    case City = 'city';
    case Neighbourhood = 'neighbourhood';
    case Type = 'type';
    case Agency = 'agency';
    case Bedrooms = 'bedrooms';
    case ParkingSpaces = 'parking_spaces';
}
