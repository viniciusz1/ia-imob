<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Blocks access when the authenticated user's Agency is deactivated.
 * Platform Admin users (agency-less) are always allowed through.
 */
class EnsureAgencyIsActive
{
    public function handle(Request $request, Closure $next): mixed
    {
        $user = $request->user();

        if ($user === null) {
            return $next($request);
        }

        // Platform Admins have no agency — always allow.
        if ($user->agency_id === null) {
            return $next($request);
        }

        $agency = $user->agency;

        if ($agency === null || ! (bool) $agency->is_active) {
            abort(403, 'Agency is deactivated.');
        }

        return $next($request);
    }
}
