<?php

namespace App\Domain\Analytics;

enum SupplyField: string
{
    case Price = 'price';
    case Area = 'area';
    case Type = 'type';
    case City = 'city';
    case Neighbourhood = 'neighbourhood';
    case Bedrooms = 'bedrooms';
    case Suites = 'suites';
    case Bathrooms = 'bathrooms';
    case ParkingSpaces = 'parking_spaces';
    case ConstructionYear = 'construction_year';
    case ListingUrl = 'listing_url';
}
