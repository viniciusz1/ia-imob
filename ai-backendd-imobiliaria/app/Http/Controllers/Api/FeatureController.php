<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\FeatureResource;
use App\Models\Feature;

class FeatureController extends Controller
{
    /**
     * Display a listing of property features.
     */
    public function index()
    {
        return FeatureResource::collection(Feature::all());
    }
}
