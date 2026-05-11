<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SavedFilter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SavedFilterController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->user()
            ->savedFilters()
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($filters);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'    => ['required', 'string', 'max:255'],
            'filters' => ['required', 'array'],
        ]);

        $filter = $request->user()->savedFilters()->create($validated);

        return response()->json($filter, 201);
    }

    public function update(Request $request, SavedFilter $savedFilter): JsonResponse
    {
        if ($savedFilter->user_id !== $request->user()->id) {
            abort(403);
        }

        $validated = $request->validate([
            'name'    => ['sometimes', 'string', 'max:255'],
            'filters' => ['sometimes', 'array'],
        ]);

        $savedFilter->update($validated);

        return response()->json($savedFilter);
    }

    public function destroy(Request $request, SavedFilter $savedFilter): JsonResponse
    {
        if ($savedFilter->user_id !== $request->user()->id) {
            abort(403);
        }

        $savedFilter->delete();

        return response()->json(['message' => 'Filtro excluído com sucesso.']);
    }
}
