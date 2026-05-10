<?php

// Vercel's deployment filesystem is read-only at runtime. Laravel needs a
// writable storage path for compiled views, cache files, and temporary files.
$storagePath = '/tmp/storage';

$_ENV['LARAVEL_STORAGE_PATH'] = $storagePath;
$_SERVER['LARAVEL_STORAGE_PATH'] = $storagePath;
putenv("LARAVEL_STORAGE_PATH={$storagePath}");

foreach ([
    "{$storagePath}/app",
    "{$storagePath}/framework/cache/data",
    "{$storagePath}/framework/sessions",
    "{$storagePath}/framework/views",
    "{$storagePath}/logs",
] as $directory) {
    if (! is_dir($directory) && ! @mkdir($directory, 0777, true) && ! is_dir($directory)) {
        throw new RuntimeException("Unable to create Laravel storage directory: {$directory}");
    }
}

// Forward Vercel requests to normal index.php
require __DIR__ . '/../public/index.php';
