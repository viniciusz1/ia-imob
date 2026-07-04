<?php

return [
    'endpoint' => env('OVERPASS_ENDPOINT', 'https://overpass-api.de/api/interpreter'),
    'timeout' => (int) env('OVERPASS_TIMEOUT', 60),
    'user_agent' => env('OVERPASS_USER_AGENT', env('APP_NAME', 'IA Imob').' POI importer'),

    'default_city' => env('OVERPASS_DEFAULT_CITY', 'Jaraguá do Sul'),
    'default_state' => env('OVERPASS_DEFAULT_STATE', 'SC'),

    'radius_meters' => [
        'muito_perto' => (int) env('OVERPASS_RADIUS_MUITO_PERTO', 1000),
        'perto' => (int) env('OVERPASS_RADIUS_PERTO', 2000),
        'regiao' => (int) env('OVERPASS_RADIUS_REGIAO', 4000),
    ],

    'fallback_neighborhood_count' => (int) env('OVERPASS_FALLBACK_NEIGHBORHOOD_COUNT', 3),
];
