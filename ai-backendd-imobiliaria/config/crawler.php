<?php

return [
    'integrations' => [
        'google_places' => [
            'label' => 'Google Places',
            'credential' => env('GOOGLE_PLACES_API_KEY', ''),
        ],
        'deepseek' => [
            'label' => 'DeepSeek',
            'credential' => env('DEEPSEEK_API_KEY', ''),
        ],
    ],
];
