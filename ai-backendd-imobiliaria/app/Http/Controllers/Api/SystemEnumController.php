<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SystemEnumResource;
use App\Models\SystemEnum;
use Illuminate\Http\Request;

class SystemEnumController extends Controller
{
    /**
     * Display a listing of system enums filtered by tags.
     */
    public function index(Request $request)
    {
        $tags = $request->input('tags');

        $query = SystemEnum::query();

        if (!empty($tags)) {
            $tagList = explode(',', $tags);
            $query->whereIn('tag', $tagList);
        }

        $enums = $query->get();

        return SystemEnumResource::collection($enums);
    }
}
