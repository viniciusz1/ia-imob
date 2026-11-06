<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureAgencyUser
{
    public function handle(Request $request, Closure $next): mixed
    {
        abort_if($request->user()?->agency_id === null, 403, 'Este módulo exige uma agência.');

        return $next($request);
    }
}
