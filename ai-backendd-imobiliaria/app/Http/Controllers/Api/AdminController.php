<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class AdminController extends Controller
{
    /**
     * Health-check endpoint for the Platform Admin area.
     * Gated by platform.agencies.view permission in the route group.
     */
    public function ping(): JsonResponse
    {
        return response()->json(['status' => 'ok']);
    }
}
