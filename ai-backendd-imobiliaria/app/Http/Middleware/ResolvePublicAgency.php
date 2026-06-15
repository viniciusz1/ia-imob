<?php

namespace App\Http\Middleware;

use App\Models\Agency;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the Agency for a public (White-Label Site) request from the request
 * host and binds it as the current Agency so the global AgencyScope applies.
 *
 * v1: the leftmost host label is the Agency slug ({slug}.platform-domain).
 * Custom-domain lookup (agency_domains) and subscription gating are layered on
 * by the host-resolution slice (#15). An unresolved host is a 404.
 */
class ResolvePublicAgency
{
    public function handle(Request $request, Closure $next): Response
    {
        // The public Next.js app fetches server-side and forwards the visitor's
        // host as X-Agency-Host (the backend can't see the agency subdomain
        // otherwise). Falls back to the real host for direct requests/tests.
        $host = $request->headers->get('X-Agency-Host') ?: $request->getHost();

        // Custom domain first (agency_domains), then subdomain slug.
        $agency = Agency::whereHas('domains', fn ($q) => $q->where('hostname', $host))->first()
            ?? Agency::where('slug', explode('.', $host)[0])->first();

        abort_if($agency === null, 404);

        // Deactivated by Platform Admin: 503 (temporarily unavailable, like lapsed).
        abort_if(! (bool) $agency->is_active, 503);

        // Subscription gating (ADR-0004): lapsed -> 503 (recoverable, keeps SEO),
        // cancelled -> 404 (gone); live and preview are served.
        $state = $agency->publicSiteState();
        abort_if($state === 'lapsed', 503);
        abort_if($state === 'gone', 404);

        app()->instance('currentAgencyId', (int) $agency->id);
        $request->attributes->set('agency', $agency);

        return $next($request);
    }
}
