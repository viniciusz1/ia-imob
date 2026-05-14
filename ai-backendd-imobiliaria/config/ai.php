<?php

return [

    'provider' => env('AI_PROVIDER', 'deepseek'),

    'structured_output' => (bool) env('AI_STRUCTURED_OUTPUT', true),

    'cache' => [
        'enabled' => (bool) env('AI_PARSE_CACHE_ENABLED', true),
        'store' => env('AI_PARSE_CACHE_STORE', 'postgres'),
        'ttl_days' => (int) env('AI_PARSE_CACHE_TTL_DAYS', 7),
    ],

    'schema_version' => '1.0.0',

    'providers' => [
        'deepseek' => [
            'api_key' => env('DEEPSEEK_API_KEY', ''),
            'base_url' => env('DEEPSEEK_BASE_URL', 'https://api.deepseek.com'),
            'model' => env('DEEPSEEK_MODEL', 'deepseek-chat'),
            'timeout' => (int) env('DEEPSEEK_TIMEOUT', 30),
        ],

        'openai' => [
            'api_key' => env('OPENAI_API_KEY', ''),
            'base_url' => env('OPENAI_BASE_URL', 'https://api.openai.com'),
            'model' => env('OPENAI_MODEL', 'gpt-4o-mini'),
            'timeout' => (int) env('OPENAI_TIMEOUT', 30),
        ],
    ],

];
